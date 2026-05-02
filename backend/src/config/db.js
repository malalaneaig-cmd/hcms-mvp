import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT) || 5432,
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'hcms',
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

/**
 * Tiny helper so callers don't have to acquire/release clients manually.
 */
export const query = (text, params) => pool.query(text, params);
