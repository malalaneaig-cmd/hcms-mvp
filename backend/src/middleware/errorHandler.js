import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// 404 handler — mounted last among route handlers
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Centralized error handler — must have 4 args for Express to recognize it
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten(),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  // Postgres unique-violation → 409 Conflict
  if (err && err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists',
      details: err.detail,
    });
  }

  // Postgres foreign-key violation → 400
  if (err && err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid foreign key',
      details: err.detail,
    });
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
