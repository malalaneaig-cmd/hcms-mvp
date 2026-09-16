import { pool } from '../config/db.js';
import { sendMessage } from './whatsapp/provider.js';
import { MSG } from './whatsapp/messages.pt.js';
import { logMessage } from './whatsapp/conversationLog.js';

/**
 * Find booked appointments in the next 24 hours that have not been
 * reminded yet, and send a WhatsApp or SMS reminder.
 *
 * Channel rule:
 *   - booked via whatsapp → remind via WhatsApp
 *   - booked via sms      → remind via SMS
 *   - any other channel   → SMS (works on every phone)
 */
export async function sendDueReminders() {
  const { rows } = await pool.query(`
    SELECT a.id,
           a.appointment_time,
           a.channel,
           p.name  AS patient_name,
           p.phone,
           d.name  AS doctor_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN doctors  d ON d.id = a.doctor_id
     WHERE a.status = 'booked'
       AND a.reminded_at IS NULL
       AND p.phone IS NOT NULL
       AND a.appointment_time > NOW()
       AND a.appointment_time <= NOW() + INTERVAL '24 hours'
     ORDER BY a.appointment_time ASC
  `);

  const results = { sent: 0, failed: 0, skipped: 0, details: [] };

  for (const appt of rows) {
    const channel = appt.channel === 'whatsapp' ? 'whatsapp' : 'sms';
    const when = formatWhen(appt.appointment_time);
    const body = MSG.REMINDER({
      patientName: appt.patient_name,
      doctorName:  appt.doctor_name,
      when,
      ref:         appt.id,
    });

    try {
      const ok = await sendMessage(appt.phone, body, channel);
      if (ok) {
        await pool.query(
          `UPDATE appointments SET reminded_at = NOW() WHERE id = $1`,
          [appt.id]
        );
        await logMessage({
          phone: appt.phone,
          channel,
          direction: 'out',
          body,
        });
        results.sent += 1;
        results.details.push({ id: appt.id, status: 'sent', channel });
      } else {
        results.failed += 1;
        results.details.push({ id: appt.id, status: 'failed', channel });
      }
    } catch (err) {
      console.error(`[reminders] #${appt.id}:`, err.message);
      results.failed += 1;
      results.details.push({ id: appt.id, status: 'error', error: err.message });
    }
  }

  if (rows.length === 0) results.skipped = 0;
  return results;
}

function formatWhen(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MS) || 15 * 60 * 1000;

export function startReminderLoop() {
  console.log(`  Reminder loop every ${Math.round(INTERVAL_MS / 60000)} min`);
  setTimeout(() => {
    sendDueReminders().catch((err) => console.error('[reminders]', err.message));
  }, 10_000);
  setInterval(() => {
    sendDueReminders().catch((err) => console.error('[reminders]', err.message));
  }, INTERVAL_MS);
}
