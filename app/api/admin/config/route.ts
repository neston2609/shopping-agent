import { NextResponse } from "next/server";
import { getConfig, setConfig } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

const AFFILIATE_KEYS = [
  "shopee_affiliate_id",
  "lazada_app_key",
  "lazada_tracking_id",
] as const;

// GET — return current affiliate config (masked for display)
export async function GET() {
  try {
    const data: Record<string, string> = {};
    for (const key of AFFILIATE_KEYS) {
      data[key] = await getConfig(key);
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/config GET]", err);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

// PUT — update affiliate config
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    for (const key of AFFILIATE_KEYS) {
      if (typeof body[key] === "string") {
        await setConfig(key, body[key].trim());
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/config PUT]", err);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
