import { pool } from '../config/db.js';
import { DEFAULT_SLOT_MINUTES } from '../constants/scheduling.js';
import { isDateWithinBookingWindow, isSlotTooSoon } from './bookingWindow.js';

function timeToMinutes(t) {
  const s = String(t).slice(0, 5);
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function weekdayFromDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).getDay();
}

function generateSlotsInBlock(startTime, endTime, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

async function getScheduleBlocks(doctorId, weekday) {
  const { rows } = await pool.query(
    `SELECT start_time::text AS start_time, end_time::text AS end_time
       FROM doctor_schedules
      WHERE doctor_id = $1 AND weekday = $2
      ORDER BY start_time ASC`,
    [doctorId, weekday]
  );
  return rows;
}

async function getBookedTimes(doctorId, dateStr) {
  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59`;
  const { rows } = await pool.query(
    `SELECT appointment_time::text AS appointment_time
       FROM appointments
      WHERE doctor_id = $1
        AND appointment_time >= $2
        AND appointment_time <= $3
        AND status IN ('booked', 'completed')
        AND deleted_at IS NULL`,
    [doctorId, dayStart, dayEnd]
  );
  return rows.map((r) => {
    const m = r.appointment_time.match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : null;
  }).filter(Boolean);
}

function slotConflictsBooked(slotTime, bookedTimes, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const slotMin = timeToMinutes(slotTime);
  for (const booked of bookedTimes) {
    const bookedMin = timeToMinutes(booked);
    if (Math.abs(slotMin - bookedMin) < slotMinutes) return true;
  }
  return false;
}

function isPastSlot(dateStr, timeStr, channel = 'website') {
  const appointmentTime = `${dateStr}T${timeStr}:00`;
  if (isSlotTooSoon(appointmentTime, channel)) return true;
  const pad = (n) => String(n).padStart(2, '0');
  const today = todayDateStr();
  if (dateStr !== today) return dateStr < today;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(timeStr) <= nowMin;
}

function todayDateStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Returns available HH:MM slots for a doctor on a given date (YYYY-MM-DD).
 */
export async function getAvailableSlots(doctorId, dateStr, channel = 'website') {
  if (!isDateWithinBookingWindow(dateStr, channel)) return [];

  const weekday = weekdayFromDate(dateStr);
  const blocks = await getScheduleBlocks(doctorId, weekday);
  if (blocks.length === 0) return [];

  let slots = [];
  for (const block of blocks) {
    slots = slots.concat(generateSlotsInBlock(block.start_time, block.end_time));
  }

  const booked = await getBookedTimes(doctorId, dateStr);
  slots = slots.filter((t) => !slotConflictsBooked(t, booked));
  slots = slots.filter((t) => !isPastSlot(dateStr, t, channel));

  return [...new Set(slots)].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export async function isSlotInSchedule(doctorId, dateStr, timeStr) {
  const weekday = weekdayFromDate(dateStr);
  const blocks = await getScheduleBlocks(doctorId, weekday);
  const mins = timeToMinutes(timeStr);
  for (const block of blocks) {
    const start = timeToMinutes(block.start_time);
    const end = timeToMinutes(block.end_time);
    if (mins >= start && mins + DEFAULT_SLOT_MINUTES <= end) return true;
  }
  return false;
}

export async function validateBookableSlot(doctorId, appointmentTime, channel = 'website') {
  const m = String(appointmentTime).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) return { ok: false, reason: 'Invalid appointment time format' };

  const [, dateStr, timeStr] = m;

  if (!isDateWithinBookingWindow(dateStr, channel)) {
    return { ok: false, reason: 'The selected date is outside the allowed booking window' };
  }
  const inSchedule = await isSlotInSchedule(doctorId, dateStr, timeStr);
  if (!inSchedule) {
    return { ok: false, reason: 'The selected time is outside clinic hours for this doctor' };
  }

  const slots = await getAvailableSlots(doctorId, dateStr, channel);
  if (!slots.includes(timeStr)) {
    return { ok: false, reason: 'The selected slot is no longer available' };
  }

  return { ok: true };
}

export async function getDoctorSchedule(doctorId) {
  const { rows } = await pool.query(
    `SELECT id, weekday, start_time::text AS start_time, end_time::text AS end_time
       FROM doctor_schedules
      WHERE doctor_id = $1
      ORDER BY weekday ASC, start_time ASC`,
    [doctorId]
  );
  return rows;
}

export async function replaceDoctorSchedule(doctorId, blocks) {
  await pool.query('DELETE FROM doctor_schedules WHERE doctor_id = $1', [doctorId]);
  for (const block of blocks) {
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, weekday, start_time, end_time)
       VALUES ($1, $2, $3, $4)`,
      [doctorId, block.weekday, block.start_time, block.end_time]
    );
  }
  return getDoctorSchedule(doctorId);
}
