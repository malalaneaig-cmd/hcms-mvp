import { z } from 'zod';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  createAppointment,
  findOrCreatePatientByPhone,
  VALID_CHANNELS,
  VALID_STATUSES,
} from '../services/schedulingEngine.js';

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Must be a valid ISO datetime string',
});

const createSchema = z.object({
  patient_id:       z.number().int().positive(),
  doctor_id:        z.number().int().positive(),
  appointment_time: isoDate,
  channel: z.enum([...VALID_CHANNELS]).optional(),
  status:  z.enum([...VALID_STATUSES]).optional(),
});

// Public booking accepts patient details directly (no login required)
const publicBookingSchema = z.object({
  patient_name:     z.string().min(1).max(100),
  patient_phone:    z.string().min(1).max(20),
  patient_email:    z.string().email().optional().nullable(),
  doctor_id:        z.number().int().positive(),
  appointment_time: isoDate,
});

const updateStatusSchema = z.object({
  status: z.enum([...VALID_STATUSES]),
});

/**
 * GET /appointments
 * Optional filters: ?from=ISO&to=ISO&doctor_id=&status=&channel=
 */
export async function list(req, res) {
  const { from, to, doctor_id, patient_id, status, channel } = req.query;
  const where = [];
  const params = [];
  let i = 1;

  if (from)       { where.push(`a.appointment_time >= $${i++}`); params.push(from); }
  if (to)         { where.push(`a.appointment_time <= $${i++}`); params.push(to); }
  if (doctor_id)  { where.push(`a.doctor_id = $${i++}`);          params.push(doctor_id); }
  if (patient_id) { where.push(`a.patient_id = $${i++}`);         params.push(patient_id); }
  if (status)     { where.push(`a.status = $${i++}`);             params.push(status); }
  if (channel)    { where.push(`a.channel = $${i++}`);            params.push(channel); }

  const sql = `
    SELECT a.*,
           p.name  AS patient_name,
           p.phone AS patient_phone,
           d.name  AS doctor_name,
           d.specialty AS doctor_specialty
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN doctors  d ON d.id = a.doctor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY a.appointment_time ASC
     LIMIT 500`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
}

export async function get(req, res) {
  const { rows } = await pool.query(
    `SELECT a.*,
            p.name AS patient_name, p.phone AS patient_phone,
            d.name AS doctor_name,  d.specialty AS doctor_specialty
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors  d ON d.id = a.doctor_id
      WHERE a.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Appointment not found');
  res.json(rows[0]);
}

/**
 * POST /appointments
 * Authenticated channel = "reception" or "phone".
 * Frontend must already know patient_id (e.g. from a search box).
 */
export async function create(req, res) {
  const data = createSchema.parse(req.body);
  const appt = await createAppointment(data);
  res.status(201).json(appt);
}

/**
 * POST /appointments/public
 * UNauthenticated booking from the public website.
 * Looks up or creates the patient by phone, then schedules the slot.
 * Channel is forced to "website".
 */
export async function publicBooking(req, res) {
  const data = publicBookingSchema.parse(req.body);

  const patient = await findOrCreatePatientByPhone({
    name:  data.patient_name,
    phone: data.patient_phone,
    email: data.patient_email,
  });

  const appt = await createAppointment({
    patient_id:       patient.id,
    doctor_id:        data.doctor_id,
    appointment_time: data.appointment_time,
    channel:          'website',
  });

  res.status(201).json({
    appointment: appt,
    patient:    { id: patient.id, name: patient.name, phone: patient.phone },
  });
}

export async function updateStatus(req, res) {
  const { status } = updateStatusSchema.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Appointment not found');
  res.json(rows[0]);
}

export async function remove(req, res) {
  const { rowCount } = await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Appointment not found');
  res.status(204).end();
}
