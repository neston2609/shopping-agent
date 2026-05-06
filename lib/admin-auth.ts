/**
 * Admin authentication helpers — Node.js runtime only (not Edge).
 * Uses scrypt for password hashing and HMAC-SHA256 for session tokens.
 */
import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";

// ─── Password hashing ────────────────────────────────────────────────────────

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

export function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, keyHex] = stored.split(":");
    if (!salt || !keyHex) return resolve(false);
    const storedKey = Buffer.from(keyHex, "hex");
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        resolve(timingSafeEqual(storedKey, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

// ─── Session tokens ───────────────────────────────────────────────────────────
// Format:  base64url(payload_json)  +  "."  +  hex(hmac-sha256)
// Payload: { exp: unix_ms }

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_COOKIE = "admin_session";

export function createSessionToken(secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Node.js-side verification (used in API routes for double-checking). */
export function verifySessionTokenNode(
  token: string,
  secret: string
): boolean {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")))
      return false;
    const { exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}
