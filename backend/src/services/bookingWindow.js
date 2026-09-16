import {
  BOOKING_MAX_DAYS_PATIENT,
  BOOKING_MAX_DAYS_STAFF,
  BOOKING_MIN_LEAD_MINUTES_PATIENT,
  BOOKING_MIN_LEAD_MINUTES_STAFF,
  getMaxDaysForChannel,
  getMinLeadMinutesForChannel,
} from '../constants/scheduling.js';

function pad(n) {
  return String(n).padStart(2, '0');
}

export function todayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysToDateStr(dateStr, days) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function parseAppointmentDateStr(appointmentTime) {
  const m = String(appointmentTime).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function getBookingWindow(channel = 'website') {
  const today = todayDateStr();
  const maxDays = getMaxDaysForChannel(channel);
  return {
    channel,
    min_date: today,
    max_date: addDaysToDateStr(today, maxDays),
    max_days: maxDays,
  };
}

export function getBookingLimits() {
  const today = todayDateStr();
  return {
    today,
    patient_max_days: BOOKING_MAX_DAYS_PATIENT,
    staff_max_days: BOOKING_MAX_DAYS_STAFF,
    patient_min_lead_minutes: BOOKING_MIN_LEAD_MINUTES_PATIENT,
    staff_min_lead_minutes: BOOKING_MIN_LEAD_MINUTES_STAFF,
    patient: getBookingWindow('website'),
    staff: getBookingWindow('reception'),
  };
}

export function parseAppointmentDateTime(appointmentTime) {
  const m = String(appointmentTime).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return { dateStr: m[1], timeStr: m[2] };
}

export function isSlotTooSoon(appointmentTime, channel = 'website') {
  const parsed = parseAppointmentDateTime(appointmentTime);
  if (!parsed) return true;

  const leadMinutes = getMinLeadMinutesForChannel(channel);
  if (leadMinutes <= 0) return false;

  const [y, mo, d] = parsed.dateStr.split('-').map(Number);
  const [hh, mm] = parsed.timeStr.split(':').map(Number);
  const slotMs = new Date(y, mo - 1, d, hh, mm, 0).getTime();
  return slotMs - Date.now() < leadMinutes * 60_000;
}

export function isDateWithinBookingWindow(dateStr, channel = 'website') {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const { min_date, max_date } = getBookingWindow(channel);
  return dateStr >= min_date && dateStr <= max_date;
}

export function validateBookingWindow(appointmentTime, channel = 'website') {
  const dateStr = parseAppointmentDateStr(appointmentTime);
  if (!dateStr) {
    return { ok: false, reason: 'Invalid appointment time format' };
  }

  const { min_date, max_date, max_days } = getBookingWindow(channel);

  if (dateStr < min_date) {
    return { ok: false, reason: 'Appointments cannot be booked in the past' };
  }

  if (dateStr > max_date) {
    return {
      ok: false,
      reason: `Appointments can only be booked up to ${max_days} days ahead for this channel`,
    };
  }

  if (isSlotTooSoon(appointmentTime, channel)) {
    const leadMinutes = getMinLeadMinutesForChannel(channel);
    return {
      ok: false,
      reason: `Appointments must be booked at least ${leadMinutes} minutes before the slot time`,
    };
  }

  return { ok: true };
}
