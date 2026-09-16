import { pool } from '../../config/db.js';
import { createAppointment, findOrCreatePatientByPhone } from '../schedulingEngine.js';
import { getAvailableSlots } from '../availability.js';
import { BOOKING_MAX_DAYS_PATIENT, CANCEL_CUTOFF_HOURS_PATIENT } from '../../constants/scheduling.js';
import { auditLog } from '../audit.js';
import { isDateWithinBookingWindow } from '../bookingWindow.js';
import { MSG } from './messages.pt.js';
import { logMessage, createEscalation } from './conversationLog.js';

/**
 * WHATSAPP / SMS CHATBOT — Conversation State Machine
 *
 * States:  greeting → awaiting_name → awaiting_doctor → awaiting_date
 *        → awaiting_time → confirming → completed
 *
 * Each incoming message is routed to the handler for the current state.
 * The handler returns the reply text and (optionally) advances the state.
 */

const SESSION_TTL_MINUTES = 30;

// ─── Session helpers ──────────────────────────────────────

async function getOrCreateSession(phone, channel = 'whatsapp') {
  // Expire stale sessions first
  await pool.query(
    `DELETE FROM chatbot_sessions WHERE phone = $1 AND channel = $2 AND expires_at < NOW()`,
    [phone, channel]
  );

  const { rows } = await pool.query(
    `SELECT * FROM chatbot_sessions
      WHERE phone = $1 AND channel = $2
      ORDER BY created_at DESC LIMIT 1`,
    [phone, channel]
  );

  if (rows[0]) return rows[0];

  // No active session — create a new one
  const { rows: created } = await pool.query(
    `INSERT INTO chatbot_sessions (phone, channel, state, expires_at)
     VALUES ($1, $2, 'greeting', NOW() + INTERVAL '${SESSION_TTL_MINUTES} minutes')
     RETURNING *`,
    [phone, channel]
  );
  return created[0];
}

async function updateSession(id, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = $${i++}`);
    vals.push(val);
  }
  sets.push(`updated_at = NOW()`);
  sets.push(`expires_at = NOW() + INTERVAL '${SESSION_TTL_MINUTES} minutes'`);
  vals.push(id);
  await pool.query(
    `UPDATE chatbot_sessions SET ${sets.join(', ')} WHERE id = $${i}`,
    vals
  );
}

async function deleteSession(id) {
  await pool.query(`DELETE FROM chatbot_sessions WHERE id = $1`, [id]);
}

// ─── Doctor list (cached per request cycle) ───────────────

async function getDoctors() {
  const { rows } = await pool.query(
    'SELECT id, name, specialty FROM doctors ORDER BY name ASC'
  );
  return rows;
}

// ─── State handlers ───────────────────────────────────────

async function handleGreeting(session, _text) {
  await updateSession(session.id, { state: 'awaiting_name' });
  return MSG.GREETING;
}

async function handleAwaitingName(session, text) {
  const name = text.trim();
  if (name.length < 2) return MSG.GREETING;

  await updateSession(session.id, { patient_name: name, state: 'awaiting_doctor', failed_attempts: 0 });

  const doctors = await getDoctors();
  return MSG.ASK_DOCTOR(doctors);
}

async function handleAwaitingDoctor(session, text) {
  const doctors = await getDoctors();
  const choice = parseInt(text.trim(), 10);

  if (isNaN(choice) || choice < 1 || choice > doctors.length) {
    return maybeEscalate(session, MSG.INVALID_DOCTOR + '\n\n' + MSG.ASK_DOCTOR(doctors));
  }

  const doctor = doctors[choice - 1];
  await updateSession(session.id, { doctor_id: doctor.id, state: 'awaiting_date', failed_attempts: 0 });
  return MSG.ASK_DATE(BOOKING_MAX_DAYS_PATIENT);
}

function parseDate(text, channel = 'whatsapp') {
  // Accept DD/MM/YYYY or DD-MM-YYYY
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return { error: 'invalid_format' };
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return { error: 'invalid_format' };

  if (!isDateWithinBookingWindow(iso, channel)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return { error: 'past' };
    return { error: 'too_far' };
  }

  return { date: iso };
}

async function handleAwaitingDate(session, text) {
  const parsed = parseDate(text, session.channel);
  if (parsed.error === 'invalid_format') return maybeEscalate(session, MSG.INVALID_DATE);
  if (parsed.error === 'past') return maybeEscalate(session, MSG.DATE_PAST);
  if (parsed.error === 'too_far') return MSG.DATE_TOO_FAR(BOOKING_MAX_DAYS_PATIENT);

  const date = parsed.date;
  const slots = await getAvailableSlots(session.doctor_id, date, session.channel);
  if (slots.length === 0) {
    return MSG.NO_SLOTS;
  }

  await updateSession(session.id, { chosen_date: date, state: 'awaiting_time', failed_attempts: 0 });
  return MSG.ASK_SLOT(slots);
}

/** Accept slot list index (e.g. "3") or a literal time (e.g. "9:30" → 09:30). */
function resolveSlotChoice(text, slots) {
  const trimmed = text.trim();

  if (trimmed.includes(':')) {
    const m = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const normalized = `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`;
    return slots.find((s) => s === normalized) || null;
  }

  const choice = parseInt(trimmed, 10);
  if (Number.isNaN(choice) || choice < 1 || choice > slots.length) return null;
  return slots[choice - 1];
}

async function handleAwaitingTime(session, text) {
  const { rows } = await pool.query(
    `SELECT *, chosen_date::text AS chosen_date_str
       FROM chatbot_sessions WHERE id = $1`,
    [session.id]
  );
  const s = rows[0];
  const dateStr = s.chosen_date_str || String(s.chosen_date).slice(0, 10);
  const slots = await getAvailableSlots(s.doctor_id, dateStr, s.channel);

  const time = resolveSlotChoice(text, slots);
  if (!time) {
    return maybeEscalate(session, MSG.INVALID_SLOT + '\n\n' + MSG.ASK_SLOT(slots));
  }

  await updateSession(session.id, { chosen_time: time, state: 'confirming', failed_attempts: 0 });

  const doctor = (await pool.query('SELECT name FROM doctors WHERE id = $1', [s.doctor_id])).rows[0];

  return MSG.CONFIRM({
    patientName: s.patient_name,
    doctorName:  doctor?.name || 'Médico',
    date:        formatDatePt(dateStr),
    time,
  });
}

function formatDatePt(dateVal) {
  if (!dateVal) return '—';
  // PostgreSQL DATE columns come back as a JS Date set to midnight UTC.
  // If we already have a string like "2026-09-15", use it directly.
  if (typeof dateVal === 'string') {
    const [yyyy, mm, dd] = dateVal.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  // Date object → extract YYYY-MM-DD from ISO string to avoid timezone shift
  const iso = dateVal.toISOString().slice(0, 10);
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

async function handleConfirming(session, text) {
  const answer = text.trim().toUpperCase();

  if (answer === 'SIM' || answer === 'S' || answer === 'YES' || answer === 'Y') {
    return await confirmBooking(session);
  }
  if (answer === 'NÃO' || answer === 'NAO' || answer === 'N' || answer === 'NO') {
    await deleteSession(session.id);
    return MSG.CANCELLED;
  }
  return maybeEscalate(session, MSG.INVALID_CONFIRM);
}

async function confirmBooking(session) {
  try {
    // Reload session — cast date/time to text to avoid JS Date timezone shift
    const { rows } = await pool.query(
      `SELECT *, chosen_date::text AS chosen_date_str, chosen_time::text AS chosen_time_str
         FROM chatbot_sessions WHERE id = $1`,
      [session.id]
    );
    const s = rows[0];

    const dateStr = s.chosen_date_str || String(s.chosen_date).slice(0, 10);
    const timeStr = (s.chosen_time_str || String(s.chosen_time)).slice(0, 5);

    const patient = await findOrCreatePatientByPhone({
      name:  s.patient_name,
      phone: s.phone,
      email: null,
    });

    const appointmentTime = `${dateStr}T${timeStr}:00`;

    const appt = await createAppointment({
      patient_id:       patient.id,
      doctor_id:        s.doctor_id,
      appointment_time: appointmentTime,
      channel:          s.channel,
    });

    await updateSession(s.id, { appointment_id: appt.id, state: 'completed' });
    return MSG.BOOKED(appt.id);
  } catch (err) {
    if (err.status === 409) {
      const slots = await getAvailableSlots(s.doctor_id, dateStr, s.channel);
      await updateSession(session.id, { state: 'awaiting_time', chosen_time: null });
      if (slots.length === 0) return MSG.NO_SLOTS;
      return MSG.CONFLICT + '\n\n' + MSG.ASK_SLOT(slots);
    }
    console.error('[chatbot] booking error:', err.message, err.stack);
    return MSG.ERROR;
  }
}

// ─── State router ─────────────────────────────────────────

const STATE_HANDLERS = {
  greeting:        handleGreeting,
  awaiting_name:   handleAwaitingName,
  awaiting_doctor: handleAwaitingDoctor,
  awaiting_date:   handleAwaitingDate,
  awaiting_time:   handleAwaitingTime,
  confirming:      handleConfirming,
};

// ─── Cancellation handler ─────────────────────────────────

const CANCEL_RE = /cancelar\s*#?\s*(\d+)/i;

async function handleCancellation(refId, phone) {
  const { rows } = await pool.query(
    `SELECT a.*, p.phone AS patient_phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
      WHERE a.id = $1 AND a.deleted_at IS NULL`,
    [refId]
  );

  if (!rows[0]) return MSG.APPT_NOT_FOUND(refId);

  const appt = rows[0];

  if (appt.patient_phone !== phone) return MSG.APPT_NOT_FOUND(refId);

  if (appt.status === 'cancelled') return MSG.APPT_ALREADY_CANCELLED(refId);

  const apptMs = new Date(appt.appointment_time).getTime();
  const cutoffMs = CANCEL_CUTOFF_HOURS_PATIENT * 60 * 60 * 1000;
  if (apptMs - Date.now() < cutoffMs) {
    return MSG.CANCEL_TOO_LATE(CANCEL_CUTOFF_HOURS_PATIENT);
  }

  await pool.query(
    `UPDATE appointments SET status = 'cancelled' WHERE id = $1`,
    [refId]
  );

  await auditLog({
    action: 'appointment_cancelled_patient',
    entityType: 'appointment',
    entityId: refId,
    patientId: appt.patient_id,
    details: { phone, channel: 'chatbot' },
  });

  return MSG.APPT_CANCELLED(refId);
}

async function maybeEscalate(session, invalidReply) {
  const n = (session.failed_attempts || 0) + 1;
  await updateSession(session.id, { failed_attempts: n });
  session.failed_attempts = n;
  if (n >= 3) {
    await createEscalation(session.phone, session.channel, 'too_many_invalid_replies');
    return MSG.ESCALATE;
  }
  return invalidReply;
}

/**
 * Main entry point.
 * Takes an incoming message (phone + text + channel) and returns the reply.
 */
export async function handleIncomingMessage({ phone, text, channel = 'whatsapp' }) {
  await logMessage({ phone, channel, direction: 'in', body: text });

  const trimmed = (text || '').trim();
  const upper = trimmed.toUpperCase();

  if (upper === 'AJUDA' || upper === 'HELP' || upper === 'HUMANO') {
    await createEscalation(phone, channel, 'patient_requested_human');
    const reply = MSG.ESCALATE;
    await logMessage({ phone, channel, direction: 'out', body: reply });
    return reply;
  }

  const cancelMatch = trimmed.match(CANCEL_RE);
  if (cancelMatch) {
    const reply = await handleCancellation(parseInt(cancelMatch[1], 10), phone);
    await logMessage({ phone, channel, direction: 'out', body: reply });
    return reply;
  }

  const session = await getOrCreateSession(phone, channel);

  if (session.state === 'completed') {
    await deleteSession(session.id);
    const fresh = await getOrCreateSession(phone, channel);
    const handler = STATE_HANDLERS[fresh.state];
    const reply = await handler(fresh, trimmed);
    await logMessage({ phone, channel, direction: 'out', body: reply, session_id: fresh.id });
    return reply;
  }

  const handler = STATE_HANDLERS[session.state];
  if (!handler) {
    console.error(`[chatbot] unknown state: ${session.state}`);
    await deleteSession(session.id);
    const reply = MSG.ERROR;
    await logMessage({ phone, channel, direction: 'out', body: reply });
    return reply;
  }

  const reply = await handler(session, trimmed);

  // Handlers like NAO confirmation delete the session before we log the reply.
  const { rows: alive } = await pool.query(
    'SELECT id FROM chatbot_sessions WHERE id = $1',
    [session.id]
  );
  await logMessage({
    phone,
    channel,
    direction: 'out',
    body: reply,
    session_id: alive[0]?.id ?? null,
  });
  return reply;
}
