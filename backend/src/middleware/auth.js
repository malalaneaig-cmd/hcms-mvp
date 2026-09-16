import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * Verifies a Bearer JWT and attaches the decoded payload to req.user.
 *
 * Public endpoints (e.g. the website booking form) bypass this middleware
 * by being mounted on a route that does NOT include `requireAuth`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Must run AFTER requireAuth. Allows only users with role === 'admin'.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required for this action' });
  }
  return next();
}

/** Must run AFTER requireAuth. Allows admin and staff (reception). */
export function requireStaff(req, res, next) {
  if (req.user?.role === 'admin' || req.user?.role === 'staff') {
    return next();
  }
  return res.status(403).json({ error: 'Staff or admin role required for this action' });
}

export function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    ...options,
  });
}
