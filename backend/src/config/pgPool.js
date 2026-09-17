/** Shared PostgreSQL pool options (local + Render production). */
export function buildPoolConfig(overrides = {}) {
  const url = process.env.DATABASE_URL;
  const useUrl = url && !overrides.user && !overrides.host;

  const config = useUrl
    ? { connectionString: url, ...overrides }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'hcms',
        ...overrides,
      };

  if (
    process.env.NODE_ENV === 'production' ||
    (url && url.includes('render.com'))
  ) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}
