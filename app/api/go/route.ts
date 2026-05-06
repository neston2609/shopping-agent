import { NextRequest, NextResponse } from "next/server";
import { logClick } from "@/database/db";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "shopee.co.th",
  "lazada.co.th",
  "c.lazada.co.th",
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.some(
    (h) => hostname === h || hostname.endsWith("." + h)
  );
}

/**
 * Lazada affiliate short-links look like:
 *   https://c.lazada.co.th/t/c.<key>.<id>/?url=<encoded-product-url>
 *
 * When the affiliate credentials are not yet verified / activated the
 * short-link may redirect to the Lazada homepage instead of the product.
 * We resolve the inner ?url= directly so the user always lands on the
 * correct product page.  Affiliate tracking still works once the account
 * is approved — the short-link redirect just becomes a no-op hop.
 */
function resolveLazadaUrl(destination: URL): URL {
  if (
    destination.hostname === "c.lazada.co.th" &&
    destination.pathname.startsWith("/t/")
  ) {
    const inner = destination.searchParams.get("url");
    if (inner) {
      try {
        const resolved = new URL(inner);
        if (isAllowedHost(resolved.hostname)) return resolved;
      } catch { /* fall through — use original */ }
    }
  }
  return destination;
}

/**
 * GET /api/out?url=<affiliateUrl>&title=<productTitle>&source=<Shopee|Lazada>
 *
 * Logs the outbound click, then redirects to the product page.
 * For Lazada affiliate short-links the inner product URL is used directly
 * so the user always reaches the product even before the affiliate account
 * is fully activated.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const url   = searchParams.get("url");
  const title = searchParams.get("title") ?? "";
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

  // Resolve Lazada affiliate short-links to the actual product URL
  const finalDestination = resolveLazadaUrl(destination);

  // Fire-and-forget click log (non-blocking, non-fatal)
  void logClick({
    productTitle: title,
    source,
    affiliateUrl: url,
    userIp:    request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    referer:   request.headers.get("referer") ?? undefined,
  });

  return NextResponse.redirect(finalDestination.toString(), { status: 302 });
}
