/**
 * DB-backed config store for admin settings.
 * Values are cached for 5 minutes to avoid hammering the DB on every scrape.
 */
import pool from "@/database/db";

interface ConfigCache {
  data: Record<string, string>;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var _adminConfigCache: ConfigCache | undefined;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadAll(): Promise<Record<string, string>> {
  if (global._adminConfigCache && Date.now() < global._adminConfigCache.expiresAt) {
    return global._adminConfigCache.data;
  }
  try {
    const { rows } = await pool.query<{ key: string; value: string }>(
      "SELECT key, value FROM admin_config"
    );
    const data: Record<string, string> = {};
    for (const row of rows) data[row.key] = row.value ?? "";
    global._adminConfigCache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch (err) {
    console.error("[admin-config] Failed to load config from DB:", err);
    return {};
  }
}

export async function getConfig(key: string, fallback = ""): Promise<string> {
  const cfg = await loadAll();
  return cfg[key] || fallback;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO admin_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
  // Bust cache so next request picks up the new value
  global._adminConfigCache = undefined;
}

export async function getAllConfig(): Promise<Record<string, string>> {
  return loadAll();
}
