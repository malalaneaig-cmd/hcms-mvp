import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const adminPool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT) || 5432,
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'hcms',
});

async function runSqlFile(label, filePath) {
  const sql = await readFile(filePath, 'utf8');
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
