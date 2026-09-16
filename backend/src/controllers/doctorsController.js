import { z } from 'zod';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { assertCanManageDoctorSchedule, assertStaff } from '../middleware/permissions.js';
import { getDoctorSchedule, replaceDoctorSchedule } from '../services/availability.js';

const DEFAULT_SCHEDULE = [
  { weekday: 1, start_time: '08:00', end_time: '12:00' },
  { weekday: 1, start_time: '14:00', end_time: '16:30' },
  { weekday: 2, start_time: '08:00', end_time: '12:00' },
  { weekday: 2, start_time: '14:00', end_time: '16:30' },
  { weekday: 3, start_time: '08:00', end_time: '12:00' },
  { weekday: 3, start_time: '14:00', end_time: '16:30' },
  { weekday: 4, start_time: '08:00', end_time: '12:00' },
  { weekday: 4, start_time: '14:00', end_time: '16:30' },
  { weekday: 5, start_time: '08:00', end_time: '12:00' },
  { weekday: 5, start_time: '14:00', end_time: '16:30' },
];

const createSchema = z.object({
  name:      z.string().min(1).max(100),
  specialty: z.string().max(100).optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function list(req, res) {
  const { rows } = await pool.query('SELECT * FROM doctors ORDER BY name ASC');
  res.json(rows);
}

export async function get(req, res) {
  const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Doctor not found');
  res.json(rows[0]);
}

export async function create(req, res) {
  assertStaff(req);
  const data = createSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO doctors (name, specialty) VALUES ($1, $2) RETURNING *`,
    [data.name, data.specialty || null]
  );
  await replaceDoctorSchedule(rows[0].id, DEFAULT_SCHEDULE);
  res.status(201).json(rows[0]);
}

export async function update(req, res) {
  assertStaff(req);
  const data = updateSchema.parse(req.body);

  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = $${i++}`);
    values.push(val);
  }
  if (fields.length === 0) throw new HttpError(400, 'No fields to update');

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE doctors SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw new HttpError(404, 'Doctor not found');
  res.json(rows[0]);
}

export async function remove(req, res) {
  assertStaff(req);
  const { rowCount } = await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Doctor not found');
  res.status(204).end();
}

const scheduleBlockSchema = z.object({
  weekday:     z.number().int().min(0).max(6),
  start_time:  z.string().regex(/^\d{2}:\d{2}$/),
  end_time:    z.string().regex(/^\d{2}:\d{2}$/),
});

const scheduleSchema = z.object({
  blocks: z.array(scheduleBlockSchema),
});

export async function getSchedule(req, res) {
  const { rows } = await pool.query('SELECT id FROM doctors WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Doctor not found');
  res.json(await getDoctorSchedule(Number(req.params.id)));
}

export async function updateSchedule(req, res) {
  const doctorId = Number(req.params.id);
  assertCanManageDoctorSchedule(req, doctorId);
  const { rows } = await pool.query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
  if (!rows[0]) throw new HttpError(404, 'Doctor not found');

  const { blocks } = scheduleSchema.parse(req.body);
  for (const block of blocks) {
    if (block.start_time >= block.end_time) {
      throw new HttpError(400, 'Each block must have start_time before end_time');
    }
  }

  const schedule = await replaceDoctorSchedule(doctorId, blocks);
  res.json(schedule);
}
