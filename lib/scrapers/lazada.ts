import type { RawProduct } from "@/types/product";
import { generateLazadaAffiliateLink } from "@/lib/affiliate";

const LAZADA_BASE = "https://www.lazada.co.th";
const MAX_RESULTS = 20;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Extract the value of a window.VAR_NAME = {...} assignment embedded in HTML.
 * Handles nested braces, strings, and escaped characters correctly.
 */
function extractWindowJson(html: string, varName: string): any {
  // Accept both "window.X=" and "X=" patterns
  for (const marker of [`${varName}=`, `${varName} =`]) {
    const idx = html.indexOf(marker);
    if (idx === -1) continue;

    const start = html.indexOf("{", idx + marker.length);
    if (start === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < Math.min(html.length, start + 5_000_000); i++) {
      const ch = html[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\" && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch {
            break; // malformed JSON — try next marker
          }
        }
      }
    }
  }
  return null;
}

export async function scrapeLazada(keyword: string): Promise<RawProduct[]> {
  try {
    const searchUrl = `${LAZADA_BASE}/catalog/?q=${encodeURIComponent(keyword)}`;

    const resp = await fetch(searchUrl, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
        Referer: LAZADA_BASE + "/",
      },
      redirect: "follow",
    });

    if (!resp.ok) {
      console.error(`[lazada-scraper] HTTP ${resp.status}`);
      return [];
    }

    const html = await resp.text();

    // ── Try known window variable names Lazada has used over time ─────────────
    let pageData: any = null;
    const varNames = [
      "window.__moduleData__",
      "__moduleData__",
      "window.pageData",
      "pageData",
    ];
    for (const name of varNames) {
      pageData = extractWindowJson(html, name);
      if (pageData) {
        console.log(`[lazada-scraper] Found data via ${name}`);
        break;
      }
    }

    // ── Fallback: Next.js page props ──────────────────────────────────────────
    if (!pageData) {
      const m = html.match(
        /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
      );
      if (m) {
        try {
          pageData = JSON.parse(m[1]);
        } catch {
          // ignore
        }
      }
    }

    if (!pageData) {
      console.warn("[lazada-scraper] Could not extract page data from HTML");
      return [];
    }

    // ── Navigate possible nesting paths to find the product list ─────────────
    const rawItems: any[] =
      pageData?.mods?.listItems ??
      pageData?.data?.mods?.listItems ??
      pageData?.props?.pageProps?.data?.mods?.listItems ??
      pageData?.pageProps?.data?.mods?.listItems ??
      pageData?.listItems ??
      [];

    if (rawItems.length === 0) {
      console.warn("[lazada-scraper] Data found but no listItems in:", Object.keys(pageData ?? {}));
      return [];
    }

    console.log(`[lazada-scraper] Got ${rawItems.length} items`);

    const products = rawItems
      .slice(0, MAX_RESULTS)
      .map((item: any) => {
        try {
          const title: string = item.name ?? item.title ?? "";

          const rawPrice = item.price ?? item.priceShow ?? item.salePrice ?? "0";
          const price =
            typeof rawPrice === "number"
              ? rawPrice
              : parseFloat(String(rawPrice).replace(/[^0-9.]/g, "")) || 0;

          let image: string = item.image ?? item.mainImage ?? "";
          if (image.startsWith("//")) image = "https:" + image;

          const rawUrl: string = item.itemUrl ?? item.url ?? "";
          const url = rawUrl.startsWith("http")
            ? rawUrl
            : rawUrl.startsWith("//")
            ? "https:" + rawUrl
            : `${LAZADA_BASE}${rawUrl}`;

          const rating: number | null = item.ratingScore
            ? parseFloat(item.ratingScore) || null
            : null;
          const reviews: number | null = item.review
            ? parseInt(String(item.review)) || null
            : null;

          return { title, price, image, url, rating, reviews };
        } catch {
          return null;
        }
      })
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== null && p.title.length > 0 && p.price > 0
      );

    return Promise.all(
      products.map(async (p) => ({
        ...p,
        source: "Lazada" as const,
        affiliateUrl: await generateLazadaAffiliateLink(p.url),
      }))
    );
  } catch (err) {
    console.error("[lazada-scraper] Error:", err);
    return [];
  }
}
