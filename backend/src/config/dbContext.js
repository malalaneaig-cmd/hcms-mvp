import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request DB session context for PostgreSQL RLS.
 *   app.user_id, app.role, app.doctor_id
 *
 * Special roles:
 *   system — trusted server paths (public booking, chatbot, reminders)
 */
export const dbContextStorage = new AsyncLocalStorage();

export function getDbContext() {
  return dbContextStorage.getStore() || null;
}

export function runWithDbContext(context, fn) {
  return dbContextStorage.run(context, fn);
}

export function systemDbContext(extra = {}) {
  return { role: 'system', userId: null, doctorId: null, ...extra };
}

export function userDbContext(user) {
  return {
    role: user.role,
    userId: user.id,
    doctorId: user.doctor_id ?? null,
  };
}
