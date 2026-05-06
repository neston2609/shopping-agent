import { chromium } from "playwright";
import type { RawProduct } from "@/types/product";
import { generateShopeeAffiliateLink } from "@/lib/affiliate";

const SHOPEE_BASE = "https://shopee.co.th";
const MAX_RESULTS = 20;
const TIMEOUT = 30_000;

export async function scrapeShopee(keyword: string): Promise<RawProduct[]> {
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

  // Hide webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  let rawItems: any[] = [];

  // ── Intercept Shopee's internal search API ──────────────────────────────────
  page.on("response", async (response) => {
    const url = response.url();
    if (
      (url.includes("/api/v4/search/search_items") ||
        url.includes("/api/v2/search/search_items")) &&
      response.status() === 200
    ) {
      try {
        const json = await response.json();
        if (Array.isArray(json?.items) && json.items.length > 0) {
          rawItems = json.items;
          console.log(`[shopee-scraper] Intercepted API: ${json.items.length} items`);
        }
      } catch {
        // ignore parse errors
      }
    }
  });

  try {
    const searchUrl = `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: TIMEOUT });
    // Extra wait to ensure all XHR responses are processed
    await page.waitForTimeout(2500);

    // ── Fallback: extract from window.__PRELOADED_STATE__ or similar ──────────
    if (rawItems.length === 0) {
      console.log("[shopee-scraper] API interception missed — trying window state");
      rawItems = await page.evaluate(() => {
        const win = window as any;
        const preloaded =
          win.__PRELOADED_STATE__ ||
          win.__SHOPEE_INIT_DATA__ ||
          win.__NEXT_DATA__?.props?.pageProps;
        if (!preloaded) return [];

        // Walk common paths where Shopee embeds search items
        const candidates = [
          preloaded?.searchResult?.searchSections,
          preloaded?.pageData?.searchResult?.searchSections,
        ];
        for (const sections of candidates) {
          if (!Array.isArray(sections)) continue;
          for (const section of sections) {
            const items = section?.data?.item;
            if (Array.isArray(items) && items.length > 0)
              return items.map((i: any) => ({ item_basic: i }));
          }
        }
        return [];
      });
    }

    // ── Last-resort DOM scraping ───────────────────────────────────────────────
    if (rawItems.length === 0) {
      console.log("[shopee-scraper] Trying DOM scraping as last resort");
      rawItems = await page.evaluate((maxResults: number) => {
        // Try multiple selector patterns — Shopee changes these often
        const selectorGroups = [
          '[data-sqe="item"]',
          '[class*="shopee-search-item-result__item"]',
          '[class*="col-xs-2-4"]',
          'li[class*="grid-"]',
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
              // Try many possible title selectors
              const titleEl =
                item.querySelector('[data-sqe="name"] span') ??
                item.querySelector('[class*="ie3A+n"] span') ??
                item.querySelector('[class*="BuyNow"]') ??
                item.querySelector("a[href*='/product/'] + div") ??
                item.querySelector("div[class*='title']");
              const title = titleEl?.textContent?.trim() ?? "";

              // Price: strip all non-numeric except dot
              const priceEl =
                item.querySelector('[class*="vc0Oq"] span') ??
                item.querySelector('[class*="_1LKBST"]') ??
                item.querySelector('[class*="price"]');
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
                  "a[href*='/product/']"
                ) as HTMLAnchorElement | null) ??
                (item.closest("a") as HTMLAnchorElement | null) ??
                (item.querySelector("a") as HTMLAnchorElement | null);
              const href = linkEl?.href ?? linkEl?.getAttribute("href") ?? "";
              const url = href.startsWith("http")
                ? href
                : `https://shopee.co.th${href}`;

              return { _dom: true, title, price, image, url };
            } catch {
              return null;
            }
          })
          .filter(
            (p): p is NonNullable<typeof p> =>
              p !== null && p.title.length > 0 && p.price > 0
          );
      }, MAX_RESULTS);
    }

    if (rawItems.length === 0) {
      console.warn("[shopee-scraper] No products found for:", keyword);
      return [];
    }

    // ── Map to RawProduct ─────────────────────────────────────────────────────
    const products = rawItems
      .slice(0, MAX_RESULTS)
      .map((item: any) => {
        try {
          // DOM-scraped items are already in final shape
          if (item._dom) {
            return {
              title: item.title as string,
              price: item.price as number,
              image: item.image as string,
              url: item.url as string,
              rating: null as number | null,
              reviews: null as number | null,
            };
          }

          // API response — item_basic wrapper
          const basic = item.item_basic ?? item;
          const title: string = basic.name ?? basic.title ?? "";
          const rawPrice: number =
            basic.price ?? basic.price_min ?? basic.price_max ?? 0;
          // Shopee stores prices as integer × 100000 (e.g. 12900000 = ฿129)
          const price = rawPrice > 10000 ? rawPrice / 100000 : rawPrice;

          const imageId: string =
            (Array.isArray(basic.images) ? basic.images[0] : null) ??
            basic.image ??
            "";
          const image = imageId
            ? imageId.startsWith("http")
              ? imageId
              : `https://cf.shopee.co.th/file/${imageId}`
            : "";

          const shopId = basic.shopid;
          const itemId = basic.itemid;
          const url =
            shopId && itemId
              ? `${SHOPEE_BASE}/product/${shopId}/${itemId}`
              : `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(title)}`;

          const rating: number | null =
            basic.item_rating?.rating_star ?? null;
          const reviews: number | null =
            basic.item_rating?.rating_count?.[0] ?? basic.sold ?? null;

          return { title, price, image, url, rating, reviews };
        } catch {
          return null;
        }
      })
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== null && p.title.length > 0 && p.price > 0
      );

    console.log(`[shopee-scraper] Returning ${products.length} products`);

    return Promise.all(
      products.map(async (p) => ({
        ...p,
        source: "Shopee" as const,
        affiliateUrl: await generateShopeeAffiliateLink(p.url),
      }))
    );
  } catch (err) {
    console.error("[shopee-scraper] Error:", err);
    return [];
  } finally {
    await browser.close();
  }
}
