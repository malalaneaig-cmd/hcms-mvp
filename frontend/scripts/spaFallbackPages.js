/**
 * Copy index.html into public route folders so direct URLs work on static hosts
 * that don't support SPA rewrite rules (e.g. Render without dashboard rewrites).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');

for (const route of ['book', 'login']) {
  const dir = join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), indexHtml);
}

console.log('✓ SPA fallback pages: /book, /login');
