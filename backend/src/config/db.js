import pg from 'pg';
import 'dotenv/config';
import { getDbContext } from './dbContext.js';
import { buildPoolConfig } from './pgPool.js';

const { Pool } = pg;

const internalPool = new Pool(
  buildPoolConfig({
    user: process.env.PGAPPUSER || 'hcms_app',
    password: process.env.PGAPPPASSWORD || 'hcms_app',
    max: 10,
    idleTimeoutMillis: 30_000,
  })
);

internalPool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

async function applySessionContext(client, ctx) {
  await client.query(
    `SELECT set_config('app.user_id', $1, true),
            set_config('app.role', $2, true),
            set_config('app.doctor_id', $3, true)`,
    [
      ctx.userId != null ? String(ctx.userId) : '',
      ctx.role || '',
      ctx.doctorId != null ? String(ctx.doctorId) : '',
    ]
  );
}

/**
 * Context-aware query — sets RLS session variables when inside dbContextStorage.
 */
export async function query(text, params) {
  const ctx = getDbContext();
  if (!ctx) {
    return internalPool.query(text, params);
  }

  const client = await internalPool.connect();
  try {
    await client.query('BEGIN');
    await applySessionContext(client, ctx);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Backward-compatible pool export — all queries should use contextual `query`. */
export const pool = {
  query,
  connect: () => internalPool.connect(),
  end: () => internalPool.end(),
};

export { internalPool };
