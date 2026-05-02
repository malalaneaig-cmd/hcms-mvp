import { z } from 'zod';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

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
  const data = createSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO doctors (name, specialty) VALUES ($1, $2) RETURNING *`,
    [data.name, data.specialty || null]
  );
  res.status(201).json(rows[0]);
}

export async function update(req, res) {
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
  const { rowCount } = await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Doctor not found');
  res.status(204).end();
}
