/**
 * Shopee Thailand scraper
 *
 * Strategy (in priority order):
 *  1. Shopee Open Platform API  — used when shopee_partner_id + shopee_partner_key
 *     are configured in the admin panel.  Fast, official, no browser needed.
 *  2. Playwright browser automation — fallback when API credentials are absent.
 *     Uses stealth patches + homepage-first navigation to reduce bot detection.
 */

import crypto from "crypto";
import { chromium } from "playwright";
import type { RawProduct } from "@/types/product";
import { generateShopeeAffiliateLink } from "@/lib/affiliate";
import { getConfig } from "@/lib/admin-config";

const SHOPEE_BASE = "https://shopee.co.th";
const OPEN_API_HOST = "https://partner.shopeemobile.com";
const MAX_RESULTS = 20;
const TIMEOUT = 45_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ─── Open Platform helpers ────────────────────────────────────────────────────

/**
 * Compute the HMAC-SHA256 signature required by every Open Platform request.
 * Formula: HMAC-SHA256( partner_id + api_path + timestamp, partner_key )
 */
function openApiSign(
  partnerId: string,
  path: string,
  timestamp: number,
  partnerKey: string
): string {
  const msg = `${partnerId}${path}${timestamp}`;
  return crypto.createHmac("sha256", partnerKey).update(msg).digest("hex");
}

async function searchViaOpenPlatform(
  keyword: string,
  partnerId: string,
  partnerKey: string
): Promise<RawProduct[]> {
  const path = "/api/v2/product/search_item";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = openApiSign(partnerId, path, timestamp, partnerKey);

  const url = new URL(OPEN_API_HOST + path);
  url.searchParams.set("partner_id", partnerId);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", sign);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page_no", "0");
  url.searchParams.set("page_size", String(MAX_RESULTS));

  const resp = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
    },
  });

  if (!resp.ok) {
    throw new Error(`Open Platform HTTP ${resp.status}`);
  }

  const json = await resp.json();

  if (json.error && json.error !== "") {
    throw new Error(`Open Platform API error: ${json.error} — ${json.message ?? ""}`);
  }

  // The response nests items under json.response.item (array of {item_id, shop_id, ...})
  const rawItems: any[] = json?.response?.item ?? json?.items ?? [];

  if (rawItems.length === 0) {
    console.warn("[shopee-scraper] Open Platform returned 0 items for:", keyword);
    return [];
  }

  console.log(`[shopee-scraper] Open Platform: ${rawItems.length} items`);

  const products = rawItems
    .slice(0, MAX_RESULTS)
    .map((item: any) => {
      try {
        const title: string = item.item_name ?? item.name ?? "";

        // Open Platform prices are in "price unit" (×100000 for THB, same as web API)
        const rawPrice: number =
          item.price_min ?? item.price_max ?? item.price ?? 0;
        const price = rawPrice > 10_000 ? rawPrice / 100_000 : rawPrice;

        let image: string = item.image ?? item.item_image ?? item.cover ?? "";
        if (image && !image.startsWith("http"))
          image = `https://cf.shopee.co.th/file/${image}`;

        const url =
          item.item_id && item.shop_id
            ? `${SHOPEE_BASE}/product/${item.shop_id}/${item.item_id}`
            : `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(title)}`;

        const rating: number | null =
          item.item_rating?.rating_star ?? item.rating_star ?? null;
        const reviews: number | null =
          item.item_rating?.rating_count?.[0] ??
          item.comment_count ??
          item.sales ??
          null;

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
      source: "Shopee" as const,
      affiliateUrl: await generateShopeeAffiliateLink(p.url),
    }))
  );
}

// ─── Playwright browser fallback ──────────────────────────────────────────────

const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
  const _q = window.navigator.permissions?.query?.bind(navigator.permissions);
  if (_q) {
    window.navigator.permissions.query = (p) =>
      p.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission, onchange: null })
        : _q(p);
  }
  Object.defineProperty(navigator, 'plugins', {
    get: () => Object.assign(
      [{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }, { name: 'Native Client' }],
      { length: 3 }
    ),
  });
  Object.defineProperty(navigator, 'languages', { get: () => ['th-TH','th','en-US','en'] });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  delete window.__playwright;
  delete window.__pw_manual;
`;

async function scrapeShopeeBrowser(keyword: string): Promise<RawProduct[]> {
  console.log("[shopee-scraper] Using browser fallback (no API credentials)");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1280,800",
    ],
  });

  const context = await browser.newContext({
    userAgent: UA,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7" },
  });

  await context.addInitScript(STEALTH_SCRIPT);
  const page = await context.newPage();
  let rawItems: any[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("shopee.co.th") &&
      url.includes("search") &&
      response.status() === 200 &&
      (response.headers()["content-type"] ?? "").includes("json")
    ) {
      try {
        const json = await response.json();
        const items = json?.items ?? json?.data?.items ?? [];
        if (Array.isArray(items) && items.length > 0 && rawItems.length === 0) {
          rawItems = items;
          console.log(`[shopee-scraper] Intercepted ${items.length} items from network`);
        }
      } catch { /* ignore */ }
    }
  });

  try {
    // Visit homepage first to establish a real session
    await page.goto(SHOPEE_BASE + "/", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await page.waitForTimeout(1500);

    // Navigate to search within the same session
    await page.goto(
      `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}`,
      { waitUntil: "domcontentloaded", timeout: TIMEOUT }
    );

    // Simulate human browsing
    await page.waitForTimeout(1500);
    await page.mouse.move(640, 400);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "smooth" }));
    await page.waitForTimeout(4000);

    // Fallback: check window state
    if (rawItems.length === 0) {
      rawItems = await page.evaluate(() => {
        const win = window as any;
        for (const root of [win.__SHOPEE_INIT_DATA__, win.__PRELOADED_STATE__]) {
          if (!root) continue;
          const sections =
            root?.fetchedSearchResult?.searchSections ??
            root?.searchResult?.searchSections;
          if (Array.isArray(sections)) {
            for (const s of sections) {
              const items = s?.data?.item;
              if (Array.isArray(items) && items.length > 0)
                return items.map((i: any) => ({ item_basic: i }));
            }
          }
        }
        return [];
      });
    }

    if (rawItems.length === 0) {
      const title = await page.title();
      console.warn(`[shopee-scraper] Browser fallback: no products. Title="${title}"`);
      return [];
    }

    const products = rawItems
      .slice(0, MAX_RESULTS)
      .map((item: any) => {
        try {
          const basic = item.item_basic ?? item;
          const title: string = basic.name ?? "";
          const rawPrice: number = basic.price ?? basic.price_min ?? 0;
          const price = rawPrice > 10_000 ? rawPrice / 100_000 : rawPrice;
          const imageId: string =
            (Array.isArray(basic.images) ? basic.images[0] : null) ?? basic.image ?? "";
          const image = imageId
            ? imageId.startsWith("http") ? imageId : `https://cf.shopee.co.th/file/${imageId}`
            : "";
          const url =
            basic.shopid && basic.itemid
              ? `${SHOPEE_BASE}/product/${basic.shopid}/${basic.itemid}`
              : `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(title)}`;
          const rating: number | null = basic.item_rating?.rating_star ?? null;
          const reviews: number | null =
            basic.item_rating?.rating_count?.[0] ?? basic.sold ?? null;
          return { title, price, image, url, rating, reviews };
        } catch { return null; }
      })
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== null && p.title.length > 0 && p.price > 0
      );

    console.log(`[shopee-scraper] Browser fallback: ${products.length} products`);

    return Promise.all(
      products.map(async (p) => ({
        ...p,
        source: "Shopee" as const,
        affiliateUrl: await generateShopeeAffiliateLink(p.url),
      }))
    );
  } catch (err) {
    console.error("[shopee-scraper] Browser error:", err);
    return [];
  } finally {
    await browser.close();
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeShopee(keyword: string): Promise<RawProduct[]> {
  // Check if Open Platform credentials are configured
  const [partnerId, partnerKey] = await Promise.all([
    getConfig("shopee_partner_id", ""),
    getConfig("shopee_partner_key", ""),
  ]);

  if (partnerId && partnerKey) {
    try {
      const result = await searchViaOpenPlatform(keyword, partnerId, partnerKey);
      if (result.length > 0) return result;
      // If API returned 0 items, fall through to browser
      console.warn("[shopee-scraper] Open Platform returned 0 items — trying browser");
    } catch (err) {
      console.error("[shopee-scraper] Open Platform failed:", (err as Error).message);
      console.log("[shopee-scraper] Falling back to browser scraping");
    }
  }

  return scrapeShopeeBrowser(keyword);
}
