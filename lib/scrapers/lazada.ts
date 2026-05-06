/**
 * Lazada Thailand scraper
 *
 * Strategy (in priority order):
 *  1. fetch() + HTML parse  — fast, no browser.  Works when Lazada serves
 *     SSR HTML with an embedded window.* JSON payload.
 *  2. Playwright browser automation — fallback when fetch gets a bot-detection
 *     page (Cloudflare challenge, empty shell, etc.).  Intercepts the XHR
 *     response that carries the product list, or reads window state after
 *     hydration.
 */

import { chromium } from "playwright";
import type { RawProduct } from "@/types/product";
import { generateLazadaAffiliateLink } from "@/lib/affiliate";

const LAZADA_BASE = "https://www.lazada.co.th";
const MAX_RESULTS = 20;
const TIMEOUT = 45_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

/**
 * Extract the value of a window.VAR_NAME = {...} assignment embedded in HTML.
 * Handles nested braces, strings, and escaped characters correctly.
 */
function extractWindowJson(html: string, varName: string): any {
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
      if (escaped) { escaped = false; continue; }
      if (ch === "\\" && inString) { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, i + 1)); }
          catch { break; }
        }
      }
    }
  }
  return null;
}

function extractPageDataFromHtml(html: string): any {
  // 1. Known window variable names (Lazada has used many over the years)
  const varNames = [
    "window.__moduleData__", "__moduleData__",
    "window.pageData",       "pageData",
    "window.__STATE__",      "__STATE__",
    "window.lzdApp",         "lzdApp",
    "window.__data__",       "__data__",
    "window.__APP_DATA__",   "__APP_DATA__",
    "window.__INITIAL_STATE__", "__INITIAL_STATE__",
  ];
  for (const name of varNames) {
    const d = extractWindowJson(html, name);
    if (d) { console.log(`[lazada-scraper] Found data via ${name}`); return d; }
  }

  // 2. Next.js __NEXT_DATA__
  const ndm = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndm) {
    try {
      const d = JSON.parse(ndm[1]);
      console.log("[lazada-scraper] Found data via __NEXT_DATA__");
      return d;
    } catch { /* ignore */ }
  }

  // 3. Scan ALL inline <script> blocks for any JSON containing product signals
  const scriptRe = /<script(?:\s[^>]*)?>([^<]{200,})<\/script>/gs;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    const src = m[1].trim();
    if (!src.startsWith("{") && !src.startsWith("[")) continue;
    try {
      const parsed = JSON.parse(src);
      const str = JSON.stringify(parsed);
      if (str.includes("listItems") || str.includes("itemUrl") || str.includes("skuId")) {
        console.log("[lazada-scraper] Found data via inline script JSON scan");
        return parsed;
      }
    } catch { /* continue */ }
  }

  // 4. Regex-extract the listItems array directly from raw HTML
  const lim = html.match(/"listItems"\s*:\s*(\[[\s\S]{10,}?\])\s*[,}]/);
  if (lim) {
    try {
      const items = JSON.parse(lim[1]);
      if (Array.isArray(items) && items.length > 0) {
        console.log("[lazada-scraper] Found data via listItems regex");
        return { mods: { listItems: items } };
      }
    } catch { /* ignore */ }
  }

  return null;
}

function parseRawItems(pageData: any): any[] {
  return (
    pageData?.mods?.listItems ??
    pageData?.data?.mods?.listItems ??
    pageData?.props?.pageProps?.data?.mods?.listItems ??
    pageData?.pageProps?.data?.mods?.listItems ??
    pageData?.listItems ??
    []
  );
}

function mapItem(item: any): { title: string; price: number; image: string; url: string; rating: number | null; reviews: number | null } | null {
  try {
    const title: string = item.name ?? item.title ?? "";

    const rawPrice = item.price ?? item.priceShow ?? item.salePrice ?? item.originalPrice ?? "0";
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
}

async function buildProducts(rawItems: any[]): Promise<RawProduct[]> {
  const products = rawItems
    .slice(0, MAX_RESULTS)
    .map(mapItem)
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
}

// ─── Strategy 1: plain fetch ──────────────────────────────────────────────────

async function scrapeLazadaFetch(keyword: string): Promise<RawProduct[] | null> {
  const searchUrl = `${LAZADA_BASE}/catalog/?q=${encodeURIComponent(keyword)}`;

  const resp = await fetch(searchUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
      Referer: LAZADA_BASE + "/",
    },
    redirect: "follow",
  });

  if (!resp.ok) {
    console.error(`[lazada-scraper] fetch HTTP ${resp.status}`);
    return null;
  }

  const html = await resp.text();

  // Debug: log what page we actually received when extraction fails
  const pageData = extractPageDataFromHtml(html);
  if (!pageData) {
    const snippet = html.slice(0, 500).replace(/\s+/g, " ");
    console.warn("[lazada-scraper] fetch: could not extract page data. HTML start:", snippet);
    return null; // signal to try browser fallback
  }

  const rawItems = parseRawItems(pageData);
  if (rawItems.length === 0) {
    console.warn("[lazada-scraper] fetch: data found but no listItems. Top-level keys:", Object.keys(pageData));
    return null; // try browser fallback
  }

  console.log(`[lazada-scraper] fetch: got ${rawItems.length} items`);
  return buildProducts(rawItems);
}

// ─── Strategy 2: Playwright browser ──────────────────────────────────────────

const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
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

async function scrapeLazadaBrowser(keyword: string): Promise<RawProduct[]> {
  console.log("[lazada-scraper] Using browser fallback");

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
  let interceptedItems: any[] = [];

  // Intercept XHR/fetch responses that look like search results
  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("lazada.co.th") &&
      response.status() === 200 &&
      (response.headers()["content-type"] ?? "").includes("json")
    ) {
      try {
        const json = await response.json();
        const items =
          json?.mods?.listItems ??
          json?.data?.mods?.listItems ??
          json?.listItems ??
          [];
        if (Array.isArray(items) && items.length > 0 && interceptedItems.length === 0) {
          interceptedItems = items;
          console.log(`[lazada-scraper] Browser: intercepted ${items.length} items from network`);
        }
      } catch { /* ignore */ }
    }
  });

  try {
    // Visit homepage first to get cookies / session
    await page.goto(LAZADA_BASE + "/", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await page.waitForTimeout(1500);

    // Navigate to search
    await page.goto(
      `${LAZADA_BASE}/catalog/?q=${encodeURIComponent(keyword)}`,
      { waitUntil: "domcontentloaded", timeout: TIMEOUT }
    );

    // Simulate human browsing
    await page.waitForTimeout(2000);
    await page.mouse.move(640, 400);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "smooth" }));
    await page.waitForTimeout(3000);

    // If network interception didn't capture results, try parsing the live DOM
    if (interceptedItems.length === 0) {
      const html = await page.content();
      const pageData = extractPageDataFromHtml(html);
      if (pageData) {
        interceptedItems = parseRawItems(pageData);
        if (interceptedItems.length > 0)
          console.log(`[lazada-scraper] Browser: got ${interceptedItems.length} items from DOM`);
      }
    }

    // Last resort: evaluate window state directly
    if (interceptedItems.length === 0) {
      interceptedItems = await page.evaluate(() => {
        const win = window as any;
        for (const key of ["__moduleData__", "__STATE__", "pageData", "__data__"]) {
          const d = win[key];
          if (!d) continue;
          const items =
            d?.mods?.listItems ??
            d?.data?.mods?.listItems ??
            d?.listItems ??
            [];
          if (Array.isArray(items) && items.length > 0) return items;
        }
        return [];
      });
      if (interceptedItems.length > 0)
        console.log(`[lazada-scraper] Browser: got ${interceptedItems.length} items from window state`);
    }

    if (interceptedItems.length === 0) {
      const title = await page.title();
      console.warn(`[lazada-scraper] Browser: no products found. Page title="${title}"`);
      return [];
    }

    return buildProducts(interceptedItems);
  } catch (err) {
    console.error("[lazada-scraper] Browser error:", err);
    return [];
  } finally {
    await browser.close();
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeLazada(keyword: string): Promise<RawProduct[]> {
  try {
    // Try the fast fetch path first
    const fetchResult = await scrapeLazadaFetch(keyword);
    if (fetchResult !== null && fetchResult.length > 0) return fetchResult;

    // fetch returned null (bot page) or 0 items — fall back to browser
    if (fetchResult === null) {
      console.log("[lazada-scraper] fetch blocked/empty — trying browser fallback");
    } else {
      console.log("[lazada-scraper] fetch found data but 0 products passed filter — trying browser");
    }
    return scrapeLazadaBrowser(keyword);
  } catch (err) {
    console.error("[lazada-scraper] Error:", err);
    return [];
  }
}
