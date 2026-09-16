/**
 * Simple in-memory rate limiter for public endpoints (MVP).
 * Replace with Redis-backed limiter in multi-instance production.
 */

const buckets = new Map();

function prune(key, windowMs) {
  const now = Date.now();
  const hits = buckets.get(key) || [];
  const fresh = hits.filter((t) => now - t < windowMs);
  if (fresh.length === 0) buckets.delete(key);
  else buckets.set(key, fresh);
  return fresh;
}

export function rateLimit({ windowMs = 60 * 60 * 1000, max = 5, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const hits = prune(key, windowMs);
    if (hits.length >= max) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }
    hits.push(Date.now());
    buckets.set(key, hits);
    return next();
  };
}

export const publicBookingLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 5,
  keyFn: (req) => `pub:${req.ip || req.socket.remoteAddress || 'unknown'}`,
});

export const webhookTestLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WEBHOOK_MAX) || 60,
  keyFn: (req) => {
    const phone = req.body?.phone || 'unknown';
    return `wh:${req.ip}:${phone}`;
  },
});
