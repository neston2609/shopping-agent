import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: false, // set to { rejectUnauthorized: false } if your host requires SSL
  });
}

// Reuse pool across hot reloads in development
const pool: Pool = global._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export default pool;

export async function logClick(params: {
  productTitle: string;
  source: string;
  affiliateUrl: string;
  userIp?: string;
  userAgent?: string;
  referer?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO clicks (product_title, source, affiliate_url, user_ip, user_agent, referer)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.productTitle,
        params.source,
        params.affiliateUrl,
        params.userIp ?? null,
        params.userAgent ?? null,
        params.referer ?? null,
      ]
    );
  } catch (err) {
    // Non-fatal: log but don't break the redirect
    console.error("[db] Failed to log click:", err);
  }
}

export async function logSearch(params: {
  query: string;
  results: number;
  cached: boolean;
  userIp?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO search_logs (query, results, cached, user_ip) VALUES ($1, $2, $3, $4)`,
      [params.query, params.results, params.cached, params.userIp ?? null]
    );
  } catch (err) {
    console.error("[db] Failed to log search:", err);
  }
}
