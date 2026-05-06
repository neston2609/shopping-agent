import { NextResponse } from "next/server";
import { getConfig, setConfig } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

const AFFILIATE_KEYS = [
  "shopee_affiliate_id",
  "shopee_partner_id",
  "shopee_partner_key",
  "lazada_app_key",
  "lazada_tracking_id",
] as const;

const TOGGLE_KEYS = ["shopee_enabled", "lazada_enabled"] as const;

// GET — return current affiliate config + platform toggles
export async function GET() {
  try {
    const data: Record<string, string> = {};
    for (const key of [...AFFILIATE_KEYS, ...TOGGLE_KEYS]) {
      // Default toggles to "true" if not yet in DB
      const fallback = TOGGLE_KEYS.includes(key as (typeof TOGGLE_KEYS)[number])
        ? "true"
        : "";
      data[key] = await getConfig(key, fallback);
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/config GET]", err);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

// PUT — update affiliate config and/or platform toggles
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    for (const key of AFFILIATE_KEYS) {
      if (typeof body[key] === "string") {
        await setConfig(key, body[key].trim());
      }
    }

    for (const key of TOGGLE_KEYS) {
      if (typeof body[key] === "string") {
        // Accept "true" / "false" strings or boolean-ish values
        const val = body[key] === "true" || body[key] === "1" ? "true" : "false";
        await setConfig(key, val);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/config PUT]", err);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
