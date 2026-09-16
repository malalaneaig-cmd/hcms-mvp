export const DEFAULT_SLOT_MINUTES = 30;

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Patient self-service: website, WhatsApp, SMS */
export const BOOKING_MAX_DAYS_PATIENT = parsePositiveInt(
  process.env.BOOKING_MAX_DAYS_PATIENT,
  30
);

/** Staff-assisted: reception desk, phone */
export const BOOKING_MAX_DAYS_STAFF = parsePositiveInt(
  process.env.BOOKING_MAX_DAYS_STAFF,
  90
);

/** Minimum minutes before slot start for patient self-service (default 4 hours) */
export const BOOKING_MIN_LEAD_MINUTES_PATIENT = parsePositiveInt(
  process.env.BOOKING_MIN_LEAD_MINUTES_PATIENT,
  240
);

/** Staff can book same-day without lead time */
export const BOOKING_MIN_LEAD_MINUTES_STAFF = parsePositiveInt(
  process.env.BOOKING_MIN_LEAD_MINUTES_STAFF,
  0
);

/** Max active (booked) future appointments per patient via self-service */
export const BOOKING_MAX_ACTIVE_PATIENT = parsePositiveInt(
  process.env.BOOKING_MAX_ACTIVE_PATIENT,
  1
);

/** Patient cancel via chatbot — hours before appointment (default 24) */
export const CANCEL_CUTOFF_HOURS_PATIENT = parsePositiveInt(
  process.env.CANCEL_CUTOFF_HOURS_PATIENT,
  24
);

export const PATIENT_FACING_CHANNELS = new Set(['website', 'whatsapp', 'sms']);
export const STAFF_FACING_CHANNELS = new Set(['reception', 'phone']);

export function getMaxDaysForChannel(channel = 'website') {
  return STAFF_FACING_CHANNELS.has(channel)
    ? BOOKING_MAX_DAYS_STAFF
    : BOOKING_MAX_DAYS_PATIENT;
}

export function getMinLeadMinutesForChannel(channel = 'website') {
  return STAFF_FACING_CHANNELS.has(channel)
    ? BOOKING_MIN_LEAD_MINUTES_STAFF
    : BOOKING_MIN_LEAD_MINUTES_PATIENT;
}

export function isPatientFacingChannel(channel) {
  return PATIENT_FACING_CHANNELS.has(channel);
}
