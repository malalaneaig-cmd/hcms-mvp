import { z } from 'zod';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

const createSchema = z.object({
  name:  z.string().min(1).max(100),
  phone: z.string().min(1).max(20).optional().nullable(),
  email: z.string().email().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function list(req, res) {
  const search = (req.query.search || '').toString().trim();
  let sql = 'SELECT * FROM patients';
  const params = [];

  if (search) {
    sql += ' WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';

  const { rows } = await pool.query(sql, params);
  res.json(rows);
}

export async function get(req, res) {
  const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Patient not found');
  res.json(rows[0]);
}

export async function create(req, res) {
  const data = createSchema.parse(req.body);

  const { rows } = await pool.query(
    `INSERT INTO patients (name, phone, email, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.phone || null, data.email || null, data.notes || null]
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
    `UPDATE patients SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw new HttpError(404, 'Patient not found');
  res.json(rows[0]);
}

export async function remove(req, res) {
  const { rowCount } = await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Patient not found');
  res.status(204).end();
}
