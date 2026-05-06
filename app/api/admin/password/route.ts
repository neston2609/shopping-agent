import { NextResponse } from "next/server";
import { verifyPassword, hashPassword } from "@/lib/admin-auth";
import { getConfig, setConfig } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both currentPassword and newPassword are required" },
        { status: 400 }
      );
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const storedHash = await getConfig("admin_password_hash");
    const ok = await verifyPassword(currentPassword, storedHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await setConfig("admin_password_hash", newHash);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/password]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
