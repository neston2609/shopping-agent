/**
 * Edge-runtime middleware — protects /admin/dashboard and /api/admin/* routes.
 * Uses Web Crypto (available in Edge) to verify the HMAC session token.
 */
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "admin_session";

// ─── Edge-compatible HMAC verification ───────────────────────────────────────

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sigHex  = token.slice(dot + 1);

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]          // sign, then compare hex — avoids ArrayBuffer sizing issues
    );

    // Re-compute the expected HMAC and convert to hex
    const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedHex !== sigHex) return false;

    // Decode payload: base64url → base64 (add padding) → JSON
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const { exp } = JSON.parse(json) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — skip
  if (pathname === "/admin" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const secret =
    process.env.ADMIN_SESSION_SECRET ?? "change-me-in-env-local-please";
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";

  const ok = token ? await verifyToken(token, secret) : false;

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/api/admin/config/:path*",
    "/api/admin/analytics/:path*",
    "/api/admin/logout/:path*",
    "/api/admin/password/:path*",
  ],
};
