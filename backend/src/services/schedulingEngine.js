import { query } from '../config/db.js';

import { HttpError } from '../middleware/errorHandler.js';

import { DEFAULT_SLOT_MINUTES, BOOKING_MAX_ACTIVE_PATIENT, isPatientFacingChannel } from '../constants/scheduling.js';

import { validateBookableSlot } from './availability.js';

import { validateBookingWindow } from './bookingWindow.js';

import { auditLog } from './audit.js';



/**

 * SCHEDULING ENGINE — single point of truth for creating appointments.

 */



const VALID_CHANNELS = new Set(['reception', 'website', 'phone', 'whatsapp', 'sms']);

const VALID_STATUSES = new Set(['booked', 'completed', 'cancelled', 'no_show']);



export async function findOrCreatePatientByPhone({ name, phone, email }) {

  if (!phone) throw new HttpError(400, 'Phone number is required to identify the patient');



  const existing = await query('SELECT * FROM patients WHERE phone = $1 AND deleted_at IS NULL', [phone]);

  if (existing.rows[0]) {

    const p = existing.rows[0];

    if (name && p.name !== name.trim()) {

      await auditLog({

        action: 'patient_name_mismatch',

        entityType: 'patient',

        entityId: p.id,

        patientId: p.id,

        details: { submitted_name: name, stored_name: p.name, phone },

      });

    }

    return p;

  }



  const inserted = await query(

    `INSERT INTO patients (name, phone, email)

     VALUES ($1, $2, $3)

     RETURNING *`,

    [name, phone, email || null]

  );

  const patient = inserted.rows[0];

  await query(

    `INSERT INTO patient_profiles (patient_id) VALUES ($1)

     ON CONFLICT (patient_id) DO NOTHING`,

    [patient.id]

  );

  await auditLog({

    action: 'patient_created',

    entityType: 'patient',

    entityId: patient.id,

    patientId: patient.id,

    details: { channel: 'phone_lookup' },

  });

  return patient;

}



async function countActiveFutureAppointments(patientId) {

  const { rows } = await query(

    `SELECT COUNT(*)::int AS n FROM appointments

      WHERE patient_id = $1

        AND status = 'booked'

        AND appointment_time > NOW()

        AND deleted_at IS NULL`,

    [patientId]

  );

  return rows[0]?.n ?? 0;

}



/**

 * Naive local datetime overlap check (no UTC conversion).

 */

export async function isDoctorAvailable(doctorId, appointmentTime, slotMinutes = DEFAULT_SLOT_MINUTES) {

  const m = String(appointmentTime).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);

  if (!m) return false;



  const [, dateStr, timeStr] = m;

  const slotMin = timeToMinutes(timeStr);



  const { rows } = await query(

    `SELECT appointment_time::text AS appointment_time

       FROM appointments

      WHERE doctor_id = $1

        AND status IN ('booked', 'completed')

        AND deleted_at IS NULL

        AND appointment_time::text LIKE $2`,

    [doctorId, `${dateStr}%`]

  );



  for (const row of rows) {

    const tm = row.appointment_time.match(/(\d{2}):(\d{2})/);

    if (!tm) continue;

    if (Math.abs(timeToMinutes(tm[1] + ':' + tm[2]) - slotMin) < slotMinutes) {

      return false;

    }

  }

  return true;

}



function timeToMinutes(t) {

  const [h, m] = t.slice(0, 5).split(':').map(Number);

  return h * 60 + m;

}



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



  const [{ rows: pRows }, { rows: dRows }] = await Promise.all([

    query('SELECT id FROM patients WHERE id = $1 AND deleted_at IS NULL', [patient_id]),

    query('SELECT id FROM doctors WHERE id = $1', [doctor_id]),

  ]);

  if (!pRows[0]) throw new HttpError(404, `Patient ${patient_id} not found`);

  if (!dRows[0]) throw new HttpError(404, `Doctor ${doctor_id} not found`);



  const windowCheck = validateBookingWindow(appointment_time, channel);

  if (!windowCheck.ok) {

    throw new HttpError(409, windowCheck.reason);

  }



  if (isPatientFacingChannel(channel)) {

    const active = await countActiveFutureAppointments(patient_id);

    if (active >= BOOKING_MAX_ACTIVE_PATIENT) {

      throw new HttpError(

        409,

        `You already have ${active} upcoming appointment(s). Cancel or complete one before booking another.`

      );

    }

  }



  const slotCheck = await validateBookableSlot(doctor_id, appointment_time, channel);

  if (!slotCheck.ok) {

    throw new HttpError(409, slotCheck.reason);

  }



  const free = await isDoctorAvailable(doctor_id, appointment_time);

  if (!free) {

    throw new HttpError(409, 'The selected time conflicts with another appointment for this doctor');

  }



  const { rows } = await query(

    `INSERT INTO appointments (patient_id, doctor_id, appointment_time, status, channel)

     VALUES ($1, $2, $3, $4, $5)

     RETURNING *`,

    [patient_id, doctor_id, appointment_time, status, channel]

  );



  await auditLog({

    action: 'appointment_created',

    entityType: 'appointment',

    entityId: rows[0].id,

    patientId: patient_id,

    details: { doctor_id, channel, status, appointment_time },

  });



  return rows[0];

}



export async function softDeleteAppointment(id, actorUserId = null) {

  const { rows } = await query(

    `UPDATE appointments

        SET deleted_at = CURRENT_TIMESTAMP

      WHERE id = $1 AND deleted_at IS NULL

      RETURNING *`,

    [id]

  );

  if (!rows[0]) throw new HttpError(404, 'Appointment not found');



  await auditLog({

    action: 'appointment_soft_deleted',

    entityType: 'appointment',

    entityId: id,

    patientId: rows[0].patient_id,

    details: { actor_user_id: actorUserId },

  });

  return rows[0];

}



export { DEFAULT_SLOT_MINUTES, VALID_CHANNELS, VALID_STATUSES };


