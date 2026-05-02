import { z } from 'zod';
import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

const createSchema = z.object({
  patient_id: z.number().int().positive(),
  content:    z.string().min(1),
  created_by: z.string().max(100).optional().nullable(),
});

export async function listForPatient(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM notes WHERE patient_id = $1 ORDER BY created_at DESC`,
    [req.params.patientId]
  );
  res.json(rows);
}

export async function create(req, res) {
  const data = createSchema.parse({
    ...req.body,
    created_by: req.body.created_by || req.user?.email || null,
  });

  const { rows } = await pool.query(
    `INSERT INTO notes (patient_id, content, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.patient_id, data.content, data.created_by]
  );
  res.status(201).json(rows[0]);
}

export async function remove(req, res) {
  const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
  if (rowCount === 0) throw new HttpError(404, 'Note not found');
  res.status(204).end();
}
