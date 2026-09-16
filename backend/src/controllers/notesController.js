import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { auditLog } from '../services/audit.js';
import { assertStaff } from '../middleware/permissions.js';

const createSchema = z.object({
  patient_id: z.number().int().positive(),
  content:    z.string().min(1),
  created_by: z.string().max(100).optional().nullable(),
});

export async function listForPatient(req, res) {
  const { rows } = await query(
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

  const { rows } = await query(
    `INSERT INTO notes (patient_id, content, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.patient_id, data.content, data.created_by]
  );

  await auditLog({
    action: 'note_created',
    entityType: 'note',
    entityId: rows[0].id,
    patientId: data.patient_id,
    req,
  });

  res.status(201).json(rows[0]);
}

export async function remove(req, res) {
  assertStaff(req);
  const { rows } = await query(
    `DELETE FROM notes WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Note not found');

  await auditLog({
    action: 'note_deleted',
    entityType: 'note',
    entityId: rows[0].id,
    patientId: rows[0].patient_id,
    req,
  });

  res.status(204).end();
}
