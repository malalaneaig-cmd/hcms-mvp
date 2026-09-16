import { runWithDbContext, userDbContext } from '../config/dbContext.js';

/** Attach authenticated user context for RLS for the remainder of the request. */
export function attachDbContext(req, _res, next) {
  if (!req.user) return next();
  runWithDbContext(userDbContext(req.user), () => next());
}
