import { query } from '../config/db.js';
import { getDbContext } from '../config/dbContext.js';

/**
 * Append-only audit trail. Never UPDATE/DELETE audit_logs (enforced in DB).
 */
export async function auditLog({
  action,
  entityType,
  entityId = null,
  patientId = null,
  details = null,
  req = null,
}) {
  const ctx = getDbContext();
  const actorUserId = ctx?.userId ?? null;
  const actorRole = ctx?.role ?? 'system';
  const ip = req?.ip || req?.socket?.remoteAddress || null;

  await query(
    `INSERT INTO audit_logs
       (actor_user_id, actor_role, action, entity_type, entity_id, patient_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      actorUserId,
      actorRole,
      action,
      entityType,
      entityId,
      patientId,
      details ? JSON.stringify(details) : null,
      ip,
    ]
  );
}
