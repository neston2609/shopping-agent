import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, SESSION_COOKIE } from "@/lib/admin-auth";
import { getConfig } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const storedHash = await getConfig("admin_password_hash");
    if (!storedHash) {
      return NextResponse.json(
        { error: "Admin not configured — run npm run db:migrate first" },
        { status: 500 }
      );
    }

    const ok = await verifyPassword(password, storedHash);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const secret =
      process.env.ADMIN_SESSION_SECRET ?? "change-me-in-env-local-please";
    const token = createSessionToken(secret);

    const res = NextResponse.json({ ok: true });

    // secure: true requires HTTPS. On plain HTTP the browser sets the cookie
    // but never sends it back, so the middleware always sees no session.
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[admin/login]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
