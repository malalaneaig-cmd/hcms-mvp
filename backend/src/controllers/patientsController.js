import { z } from 'zod';
import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { auditLog } from '../services/audit.js';
import { assertStaff } from '../middleware/permissions.js';

const createSchema = z.object({
  name:  z.string().min(1).max(100),
  phone: z.string().min(1).max(20).optional().nullable(),
  email: z.string().email().max(100).optional().nullable(),
  clinical_notes: z.string().optional().nullable(),
  allergies:      z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

const patientSelect = `
  SELECT p.*,
         pp.clinical_notes,
         pp.allergies,
         pp.updated_at AS profile_updated_at
    FROM patients p
    LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
`;

export async function list(req, res) {
  const search = (req.query.search || '').toString().trim();
  let sql = `${patientSelect} WHERE p.deleted_at IS NULL`;
  const params = [];

  if (search) {
    sql += ' AND (p.name ILIKE $1 OR p.phone ILIKE $1 OR p.email ILIKE $1)';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY p.created_at DESC LIMIT 200';

  const { rows } = await query(sql, params);
  res.json(rows);
}

export async function get(req, res) {
  const { rows } = await query(
    `${patientSelect} WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Patient not found');

  await auditLog({
    action: 'patient_viewed',
    entityType: 'patient',
    entityId: rows[0].id,
    patientId: rows[0].id,
    req,
  });

  res.json(rows[0]);
}

export async function create(req, res) {
  assertStaff(req);
  const data = createSchema.parse(req.body);

  const { rows } = await query(
    `INSERT INTO patients (name, phone, email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.name, data.phone || null, data.email || null]
  );
  const patient = rows[0];

  await query(
    `INSERT INTO patient_profiles (patient_id, clinical_notes, allergies)
     VALUES ($1, $2, $3)`,
    [patient.id, data.clinical_notes || null, data.allergies || null]
  );

  await auditLog({
    action: 'patient_created',
    entityType: 'patient',
    entityId: patient.id,
    patientId: patient.id,
    req,
  });

  const full = await query(`${patientSelect} WHERE p.id = $1`, [patient.id]);
  res.status(201).json(full.rows[0]);
}

export async function update(req, res) {
  assertStaff(req);
  const data = updateSchema.parse(req.body);

  const { rows: existing } = await query(
    'SELECT id FROM patients WHERE id = $1 AND deleted_at IS NULL',
    [req.params.id]
  );
  if (!existing[0]) throw new HttpError(404, 'Patient not found');

  const identityFields = ['name', 'phone', 'email'];
  const identityUpdates = {};
  for (const key of identityFields) {
    if (data[key] !== undefined) identityUpdates[key] = data[key];
  }

  if (Object.keys(identityUpdates).length > 0) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(identityUpdates)) {
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
    values.push(req.params.id);
    await query(`UPDATE patients SET ${fields.join(', ')} WHERE id = $${i}`, values);
  }

  if (data.clinical_notes !== undefined || data.allergies !== undefined) {
    await query(
      `INSERT INTO patient_profiles (patient_id, clinical_notes, allergies)
       VALUES ($1, $2, $3)
       ON CONFLICT (patient_id) DO UPDATE SET
         clinical_notes = COALESCE(EXCLUDED.clinical_notes, patient_profiles.clinical_notes),
         allergies = COALESCE(EXCLUDED.allergies, patient_profiles.allergies),
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.params.id,
        data.clinical_notes ?? null,
        data.allergies ?? null,
      ]
    );
  }

  await auditLog({
    action: 'patient_updated',
    entityType: 'patient',
    entityId: Number(req.params.id),
    patientId: Number(req.params.id),
    req,
  });

  const { rows } = await query(`${patientSelect} WHERE p.id = $1`, [req.params.id]);
  res.json(rows[0]);
}

export async function remove(req, res) {
  assertStaff(req);
  const { rows } = await query(
    `UPDATE patients SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Patient not found');

  await auditLog({
    action: 'patient_soft_deleted',
    entityType: 'patient',
    entityId: Number(req.params.id),
    patientId: Number(req.params.id),
    req,
  });
  res.status(204).end();
}
