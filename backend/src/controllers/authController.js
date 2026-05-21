import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

const registerSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(6),
  full_name: z.string().min(1),
  role:      z.enum(['staff', 'admin', 'doctor']).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const hash = await bcrypt.hash(data.password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, created_at`,
    [data.email, hash, data.full_name, data.role || 'staff']
  );

  const user = rows[0];
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ user, token });
}

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
    },
    token,
  });
}

export async function me(req, res) {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'User not found');
  res.json(rows[0]);
}

/**
 * GET /api/auth/users  — admin-only listing of all staff users.
 * Never includes password_hash.
 */
export async function listUsers(_req, res) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, role, created_at
       FROM users
       ORDER BY id ASC`
  );
  res.json(rows);
}
