import { z } from 'zod';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { assertStaff } from '../middleware/permissions.js';

const createSchema = z.object({
  patient_id: z.number().int().positive(),
  amount:     z.number().positive(),
  status:     z.enum(['unpaid', 'paid']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['unpaid', 'paid']),
});

export async function list(req, res) {
  const { status, patient_id } = req.query;
  const where = [];
  const params = [];
  let i = 1;

  if (status)     { where.push(`i.status = $${i++}`);     params.push(status); }
  if (patient_id) { where.push(`i.patient_id = $${i++}`); params.push(patient_id); }

  const sql = `
    SELECT i.*, p.name AS patient_name, p.phone AS patient_phone
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY i.created_at DESC
     LIMIT 500`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
}

export async function get(req, res) {
  const { rows } = await pool.query(
    `SELECT i.*, p.name AS patient_name, p.phone AS patient_phone
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
      WHERE i.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Invoice not found');
  res.json(rows[0]);
}

export async function create(req, res) {
  assertStaff(req);
  const data = createSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO invoices (patient_id, amount, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.patient_id, data.amount, data.status || 'unpaid']
  );
  res.status(201).json(rows[0]);
}

export async function updateStatus(req, res) {
  assertStaff(req);
  const { status } = updateStatusSchema.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Invoice not found');
  res.json(rows[0]);
}

export async function remove(req, res) {
  assertStaff(req);
  const { rowCount } = await pool.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Invoice not found');
  res.status(204).end();
}
