import { chromium } from "playwright";
import type { RawProduct } from "@/types/product";
import { generateLazadaAffiliateLink } from "@/lib/affiliate";

const LAZADA_BASE = "https://www.lazada.co.th";
const MAX_RESULTS = 20;
const TIMEOUT = 30_000;

export async function scrapeLazada(keyword: string): Promise<RawProduct[]> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "th-TH",
    extraHTTPHeaders: {
      "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  let rawItems: any[] = [];

  // ── Intercept Lazada's internal catalog API ───────────────────────────────
  page.on("response", async (response) => {
    const url = response.url();
    const contentType = response.headers()["content-type"] ?? "";
    if (
      url.includes("lazada.co.th") &&
      response.status() === 200 &&
      contentType.includes("json") &&
      (url.includes("catalog") ||
        url.includes("search") ||
        url.includes("product") ||
        url.includes("/api/"))
    ) {
      try {
        const json = await response.json();
        // Lazada API can nest items in different ways
        const candidates = [
          json?.rgv587_flag?.items,
          json?.mods?.listItems,
          json?.data?.mods?.listItems,
          json?.listItems,
          json?.items,
          json?.data?.items,
        ];
        for (const list of candidates) {
          if (Array.isArray(list) && list.length > 0 && rawItems.length === 0) {
            rawItems = list;
            console.log(`[lazada-scraper] Intercepted API (${url.slice(0, 80)}): ${list.length} items`);
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  });

  try {
    const searchUrl = `${LAZADA_BASE}/catalog/?q=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: TIMEOUT });
    await page.waitForTimeout(2500);

    // ── Fallback: extract from window.__moduleData__ ───────────────────────
    if (rawItems.length === 0) {
      console.log("[lazada-scraper] API interception missed — trying window state");
      rawItems = await page.evaluate(() => {
        const win = window as any;

        // Lazada embeds search data in several possible window properties
        const sources = [
          win.__moduleData__,
          win.pageData,
          win.__NEXT_DATA__?.props?.pageProps,
        ];

        for (const src of sources) {
          if (!src) continue;
          const candidates = [
            src?.mods?.listItems,
            src?.data?.mods?.listItems,
            src?.pageProps?.data?.mods?.listItems,
            src?.listItems,
          ];
          for (const list of candidates) {
            if (Array.isArray(list) && list.length > 0) return list;
          }
        }

        // Also try finding embedded JSON in <script> tags
        const scripts = Array.from(
          document.querySelectorAll("script:not([src])")
        );
        for (const script of scripts) {
          const text = script.textContent ?? "";
          if (text.includes('"listItems"') && text.includes('"name"')) {
            try {
              // Try extracting the JSON object containing listItems
              const match = text.match(/\{[\s\S]*"listItems"\s*:\s*\[/);
              if (match) {
                // Find the actual JSON by looking at window assignment
                const winMatch = text.match(
                  /window\.__moduleData__\s*=\s*(\{[\s\S]+?\});?\s*(?:window|$|\n)/
                );
                if (winMatch) {
                  const parsed = JSON.parse(winMatch[1]);
                  const items =
                    parsed?.mods?.listItems ?? parsed?.data?.mods?.listItems;
                  if (Array.isArray(items) && items.length > 0) return items;
                }
              }
            } catch {
              // ignore
            }
          }
        }

        return [];
      });
    }

    // ── Last-resort DOM scraping ──────────────────────────────────────────────
    if (rawItems.length === 0) {
      console.log("[lazada-scraper] Trying DOM scraping as last resort");
      rawItems = await page.evaluate((maxResults: number) => {
        const selectorGroups = [
          '[data-qa-locator="product-item"]',
          '[class*="gridItem"]',
          '[class*="product-card"]',
          ".c1ZEkM",   // older class
          ".Bm3ON",
        ];

        let items: Element[] = [];
        for (const sel of selectorGroups) {
          const found = Array.from(document.querySelectorAll(sel));
          if (found.length >= 3) {
            items = found.slice(0, maxResults);
            break;
          }
        }

        return items
          .map((item) => {
            try {
              const titleEl =
                (item.querySelector(
                  "[class*='RfADt'] a"
                ) as HTMLAnchorElement | null) ??
                (item.querySelector("a[title]") as HTMLAnchorElement | null) ??
                item.querySelector("[class*='title']");
              const title =
                (titleEl as HTMLAnchorElement | null)?.title ??
                titleEl?.textContent?.trim() ??
                "";

              const priceEl =
                item.querySelector("[class*='price'] span") ??
                item.querySelector("[class*='Price']");
              const priceText =
                priceEl?.textContent?.replace(/[^0-9.]/g, "") ?? "0";
              const price = parseFloat(priceText) || 0;

              const imgEl = item.querySelector("img");
              let image =
                imgEl?.getAttribute("src") ??
                imgEl?.getAttribute("data-src") ??
                "";
              if (image.startsWith("//")) image = "https:" + image;

              const linkEl =
                (item.querySelector(
                  "a[href*='lazada.co.th']"
                ) as HTMLAnchorElement | null) ??
                (item.querySelector("a") as HTMLAnchorElement | null);
              const href =
                linkEl?.href ?? linkEl?.getAttribute("href") ?? "";
              const url = href.startsWith("http")
                ? href
                : `${LAZADA_BASE}${href}`;

              const ratingEl =
                item.querySelector("[class*='rating']") ??
                item.querySelector("[aria-label*='star']");
              const ratingText =
                (ratingEl as HTMLElement | null)
                  ?.getAttribute("aria-label")
                  ?.match(/[\d.]+/)?.[0] ??
                ratingEl?.textContent?.trim() ??
                "";
              const rating = ratingText ? parseFloat(ratingText) || null : null;

              return { _dom: true, name: title, price, image, itemUrl: url, ratingScore: rating ? String(rating) : null };
            } catch {
              return null;
            }
          })
          .filter(
            (p): p is NonNullable<typeof p> =>
              p !== null && (p.name?.length ?? 0) > 0 && (p.price ?? 0) > 0
          );
      }, MAX_RESULTS);
    }

    if (rawItems.length === 0) {
      console.warn("[lazada-scraper] No products found for:", keyword);
      return [];
    }

    // ── Map to RawProduct ─────────────────────────────────────────────────────
    const products = rawItems
      .slice(0, MAX_RESULTS)
      .map((item: any) => {
        try {
          const title: string = item.name ?? item.title ?? "";
          // Price may be a number or a string like "฿129" or "129.00"
          const rawPrice = item.price ?? item.priceShow ?? item.originalPrice ?? "0";
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

    console.log(`[lazada-scraper] Returning ${products.length} products`);

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
  } finally {
    await browser.close();
  }
}
