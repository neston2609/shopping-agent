// Run: node database/migrate.js  (or: npm run db:migrate)
// Creates the database, applies schema, and seeds the default admin password.
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { scrypt, randomBytes } = require("crypto");
const fs = require("fs");
const path = require("path");

// ---- Password hashing (mirrors lib/admin-auth.ts) ----
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in .env.local");
    process.exit(1);
  }

  // 1. Create DB (connect to postgres first)
  const adminUrl = dbUrl.replace(/\/[^/?]+(\?.*)?$/, "/postgres$1");
  const adminPool = new Pool({ connectionString: adminUrl });
  try {
    await adminPool.query("CREATE DATABASE shopping_comparison");
    console.log("✅ Created database: shopping_comparison");
  } catch (e) {
    if (e.code === "42P04") {
      console.log("ℹ️  Database already exists — skipping creation");
    } else {
      throw e;
    }
  } finally {
    await adminPool.end();
  }

  // 2. Apply schema
  const pool = new Pool({ connectionString: dbUrl });
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !s.startsWith("CREATE DATABASE") &&
        !s.startsWith("\\c")
    );

  for (const stmt of statements) {
    await pool.query(stmt + ";");
  }
  console.log("✅ Schema applied");

  // 3. Seed default admin password ("admin1234") if not already set
  const existing = await pool.query(
    "SELECT value FROM admin_config WHERE key = 'admin_password_hash'"
  );
  if (existing.rows.length === 0 || !existing.rows[0].value) {
    const hash = await hashPassword("admin1234");
    await pool.query(
      `INSERT INTO admin_config (key, value)
       VALUES ('admin_password_hash', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [hash]
    );
    console.log("✅ Default admin password seeded (admin1234)");
  } else {
    console.log("ℹ️  Admin password already set — skipping seed");
  }

  await pool.end();
  console.log("\n🎉 Migration complete — run: npm run dev");
}

migrate().catch((e) => {
  console.error("❌ Migration failed:", e.message);
  process.exit(1);
});
