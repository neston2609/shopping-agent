import { NextRequest, NextResponse } from "next/server";
import { logClick } from "@/database/db";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "shopee.co.th",
  "lazada.co.th",
  "s.lazada.co.th",
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.some(
    (h) => hostname === h || hostname.endsWith("." + h)
  );
}

/**
 * GET /api/go?url=<affiliateUrl>&title=<productTitle>&source=<Shopee|Lazada>
 *
 * Logs the outbound click then redirects to the affiliate/product URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const url    = searchParams.get("url");
  const title  = searchParams.get("title") ?? "";
  const source = searchParams.get("source") ?? "";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let destination: URL;
  try {
    destination = new URL(url);
    if (!isAllowedHost(destination.hostname)) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  // Fire-and-forget click log (non-blocking, non-fatal)
  void logClick({
    productTitle: title,
    source,
    affiliateUrl: url,
    userIp:    request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    referer:   request.headers.get("referer") ?? undefined,
  });

  return NextResponse.redirect(destination.toString(), { status: 302 });
}
