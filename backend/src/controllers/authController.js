import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { auditLog } from '../services/audit.js';

const registerSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(6),
  full_name: z.string().min(1),
  role:      z.enum(['staff', 'admin', 'doctor']).optional(),
  doctor_id: z.number().int().positive().optional().nullable(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function userPayload(row) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    doctor_id: row.doctor_id ?? null,
    created_at: row.created_at,
  };
}

function tokenPayload(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    doctor_id: row.doctor_id ?? null,
  };
}

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  if (data.role === 'doctor' && !data.doctor_id) {
    throw new HttpError(400, 'doctor_id is required when creating a doctor account');
  }
  const hash = await bcrypt.hash(data.password, 10);

  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, role, doctor_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, role, doctor_id, created_at`,
    [data.email, hash, data.full_name, data.role || 'staff', data.doctor_id || null]
  );

  const user = rows[0];
  await auditLog({
    action: 'user_created',
    entityType: 'user',
    entityId: user.id,
    details: { role: user.role, doctor_id: user.doctor_id },
    req,
  });

  const token = signToken(tokenPayload(user));
  res.status(201).json({ user: userPayload(user), token });
}

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await auditLog({ action: 'login_failed', entityType: 'user', details: { email }, req });
    throw new HttpError(401, 'Invalid credentials');
  }

  if (user.role === 'doctor' && !user.doctor_id) {
    throw new HttpError(403, 'Doctor account is not linked to a practitioner profile. Contact admin.');
  }

  await auditLog({ action: 'login_success', entityType: 'user', entityId: user.id, req });

  const token = signToken(tokenPayload(user));
  res.json({ user: userPayload(user), token });
}

export async function me(req, res) {
  const { rows } = await query(
    'SELECT id, email, full_name, role, doctor_id, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'User not found');
  res.json(rows[0]);
}

export async function listUsers(_req, res) {
  const { rows } = await query(
    `SELECT id, email, full_name, role, doctor_id, created_at
       FROM users
       ORDER BY id ASC`
  );
  res.json(rows);
}
