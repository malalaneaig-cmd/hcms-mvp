import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pool } from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const schemaPath = resolve(__dirname, '..', 'db', 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');

  console.log(`Running schema:\n  ${schemaPath}`);
  await pool.query(sql);
  console.log('✓ Database schema applied.');
  await pool.end();
}

run().catch((err) => {
  console.error('✗ initDb failed:', err.message);
  process.exit(1);
});
