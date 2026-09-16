import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { buildPoolConfig } from '../src/config/pgPool.js';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const adminPool = new Pool(buildPoolConfig());

async function runSqlFile(label, filePath) {
  let sql = await readFile(filePath, 'utf8');
  const dbName = process.env.PGDATABASE || 'hcms';
  if (label.includes('security')) {
    sql = sql.replace(
      'GRANT CONNECT ON DATABASE hcms TO hcms_app;',
      `GRANT CONNECT ON DATABASE ${dbName} TO hcms_app;`
    );
  }
  console.log(`Running ${label}:\n  ${filePath}`);
  await adminPool.query(sql);
  console.log(`✓ ${label} applied.`);
}

async function run() {
  const dbDir = resolve(__dirname, '..', 'db');
  await runSqlFile('schema', resolve(dbDir, 'schema.sql'));
  await runSqlFile('security (RLS + hcms_app role)', resolve(dbDir, 'security.sql'));
  await adminPool.end();
}

run().catch((err) => {
  console.error('✗ initDb failed:', err.message);
  process.exit(1);
});
