import { z } from 'zod';

import { query } from '../config/db.js';

import { runWithDbContext, systemDbContext } from '../config/dbContext.js';

import { HttpError } from '../middleware/errorHandler.js';

import {

  createAppointment,

  findOrCreatePatientByPhone,

  softDeleteAppointment,

  VALID_CHANNELS,

  VALID_STATUSES,

} from '../services/schedulingEngine.js';

import { getAvailableSlots } from '../services/availability.js';

import { getBookingLimits } from '../services/bookingWindow.js';

import { auditLog } from '../services/audit.js';
import { assertStaff } from '../middleware/permissions.js';



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



export async function bookingLimits(_req, res) {

  res.json(getBookingLimits());

}



export async function availableSlots(req, res) {

  const doctorId = Number(req.query.doctor_id);

  const date = req.query.date;

  const channel = req.query.channel || 'website';



  if (!doctorId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {

    throw new HttpError(400, 'doctor_id and date (YYYY-MM-DD) are required');

  }

  if (!VALID_CHANNELS.has(channel)) {

    throw new HttpError(400, `channel must be one of: ${[...VALID_CHANNELS].join(', ')}`);

  }



  const { rows } = await query('SELECT id FROM doctors WHERE id = $1', [doctorId]);

  if (!rows[0]) throw new HttpError(404, 'Doctor not found');



  const slots = await getAvailableSlots(doctorId, date, channel);

  res.json({ doctor_id: doctorId, date, channel, slots });

}



export async function list(req, res) {

  const { from, to, doctor_id, patient_id, status, channel } = req.query;

  const where = ['a.deleted_at IS NULL', 'p.deleted_at IS NULL'];

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

     WHERE ${where.join(' AND ')}

     ORDER BY a.appointment_time ASC

     LIMIT 500`;



  const { rows } = await query(sql, params);

  res.json(rows);

}



export async function get(req, res) {

  const { rows } = await query(

    `SELECT a.*,

            p.name AS patient_name, p.phone AS patient_phone,

            d.name AS doctor_name,  d.specialty AS doctor_specialty

       FROM appointments a

       JOIN patients p ON p.id = a.patient_id

       JOIN doctors  d ON d.id = a.doctor_id

      WHERE a.id = $1 AND a.deleted_at IS NULL`,

    [req.params.id]

  );

  if (!rows[0]) throw new HttpError(404, 'Appointment not found');

  res.json(rows[0]);

}



export async function create(req, res) {
  assertStaff(req);
  const data = createSchema.parse(req.body);

  const appt = await createAppointment(data);

  res.status(201).json(appt);

}



export async function publicBooking(req, res) {

  return runWithDbContext(systemDbContext(), async () => {

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

  });

}



export async function updateStatus(req, res) {
  assertStaff(req);
  const { status } = updateStatusSchema.parse(req.body);

  const { rows } = await query(

    `UPDATE appointments SET status = $1

      WHERE id = $2 AND deleted_at IS NULL

      RETURNING *`,

    [status, req.params.id]

  );

  if (!rows[0]) throw new HttpError(404, 'Appointment not found');



  await auditLog({

    action: 'appointment_status_changed',

    entityType: 'appointment',

    entityId: rows[0].id,

    patientId: rows[0].patient_id,

    details: { status },

    req,

  });



  res.json(rows[0]);

}



export async function remove(req, res) {
  assertStaff(req);
  await softDeleteAppointment(Number(req.params.id), req.user?.id);

  res.status(204).end();

}


