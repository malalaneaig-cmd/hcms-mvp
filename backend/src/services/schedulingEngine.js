import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * SCHEDULING ENGINE
 * -----------------
 * The single point of truth for creating appointments.
 * All 3 booking channels (reception | website | phone) call into this.
 *
 * Rules enforced here:
 *   1. Patient and doctor must exist.
 *   2. The chosen slot cannot overlap an existing booked appointment
 *      for the same doctor (default slot length: 30 minutes).
 *   3. Status defaults to "booked".
 *   4. Channel is recorded so we know where the booking came from.
 */

const DEFAULT_SLOT_MINUTES = 30;
const VALID_CHANNELS = new Set(['reception', 'website', 'phone']);
const VALID_STATUSES = new Set(['booked', 'completed', 'cancelled', 'no_show']);

/**
 * Find or create a patient by phone number.
 * Used by the website + phone channels where the patient may
 * not already exist in the system.
 */
export async function findOrCreatePatientByPhone({ name, phone, email }) {
  if (!phone) throw new HttpError(400, 'Phone number is required to identify the patient');

  const existing = await pool.query('SELECT * FROM patients WHERE phone = $1', [phone]);
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await pool.query(
    `INSERT INTO patients (name, phone, email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, phone, email || null]
  );
  return inserted.rows[0];
}

/**
 * Check whether a given doctor is free at a given moment.
 * Considers default 30-minute slots and ignores cancelled/no-show appts.
 */
export async function isDoctorAvailable(doctorId, appointmentTime, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const time = new Date(appointmentTime);
  const windowStart = new Date(time.getTime() - slotMinutes * 60_000);
  const windowEnd   = new Date(time.getTime() + slotMinutes * 60_000);

  const { rows } = await pool.query(
    `SELECT id FROM appointments
      WHERE doctor_id = $1
        AND status IN ('booked', 'completed')
        AND appointment_time > $2
        AND appointment_time < $3
      LIMIT 1`,
    [doctorId, windowStart.toISOString(), windowEnd.toISOString()]
  );
  return rows.length === 0;
}

/**
 * THE CORE FUNCTION — every channel calls this.
 *
 *   create_appointment(patient_id, doctor_id, datetime, channel?)
 */
export async function createAppointment({
  patient_id,
  doctor_id,
  appointment_time,
  channel = 'reception',
  status  = 'booked',
}) {
  if (!VALID_CHANNELS.has(channel)) {
    throw new HttpError(400, `channel must be one of: ${[...VALID_CHANNELS].join(', ')}`);
  }
  if (!VALID_STATUSES.has(status)) {
    throw new HttpError(400, `status must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  // Verify references exist (gives nicer errors than raw FK violations)
  const [{ rows: pRows }, { rows: dRows }] = await Promise.all([
    pool.query('SELECT id FROM patients WHERE id = $1', [patient_id]),
    pool.query('SELECT id FROM doctors  WHERE id = $1', [doctor_id]),
  ]);
  if (!pRows[0]) throw new HttpError(404, `Patient ${patient_id} not found`);
  if (!dRows[0]) throw new HttpError(404, `Doctor ${doctor_id} not found`);

  // Conflict check
  const free = await isDoctorAvailable(doctor_id, appointment_time);
  if (!free) {
    throw new HttpError(409, 'The selected time conflicts with another appointment for this doctor');
  }

  const { rows } = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_time, status, channel)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [patient_id, doctor_id, appointment_time, status, channel]
  );
  return rows[0];
}

export { DEFAULT_SLOT_MINUTES, VALID_CHANNELS, VALID_STATUSES };
