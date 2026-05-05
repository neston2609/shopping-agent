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

  const page = await context.newPage();

  try {
    const searchUrl = `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: TIMEOUT });

    // Wait for product grid
    await page
      .waitForSelector('[data-sqe="item"]', { timeout: TIMEOUT })
      .catch(() => null);

    // Give JS time to hydrate
    await page.waitForTimeout(2000);

    const products = await page.evaluate((maxResults: number) => {
      const items = Array.from(
        document.querySelectorAll('[data-sqe="item"]')
      ).slice(0, maxResults);

      return items
        .map((item) => {
          try {
            // Title
            const titleEl =
              item.querySelector('[data-sqe="name"] span') ??
              item.querySelector(".shopee-search-item-result__item-name");
            const title = titleEl?.textContent?.trim() ?? "";

            // Price — Shopee displays in Thai Baht
            const priceEl =
              item.querySelector("._1LKBST") ??
              item.querySelector("[class*='price']");
            const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, "") ?? "0";
            const price = parseFloat(priceText) || 0;

            // Image
            const imgEl = item.querySelector("img");
            let image = imgEl?.getAttribute("src") ?? imgEl?.getAttribute("data-src") ?? "";
            if (image.startsWith("//")) image = "https:" + image;

            // Rating
            const ratingEl =
              item.querySelector("[class*='rating'] span") ??
              item.querySelector("[class*='stars']");
            const rating = ratingEl
              ? parseFloat(ratingEl.textContent?.trim() ?? "0") || null
              : null;

            // Reviews
            const reviewEl =
              item.querySelector("[class*='sold']") ??
              item.querySelector("[class*='review']");
            const reviewText = reviewEl?.textContent?.replace(/[^0-9]/g, "") ?? "";
            const reviews = reviewText ? parseInt(reviewText) : null;

            // URL — Shopee items have a link wrapper
            const linkEl =
              item.querySelector("a[href*='/product/']") ??
              item.closest("a") ??
              item.querySelector("a");
            const href = linkEl?.getAttribute("href") ?? "";
            const url = href.startsWith("http")
              ? href
              : `https://shopee.co.th${href}`;

            return { title, price, image, rating, reviews, url };
          } catch {
            return null;
          }
        })
        .filter(
          (p): p is NonNullable<typeof p> =>
            p !== null && p.title.length > 0 && p.price > 0
        );
    }, MAX_RESULTS);

    return products.map((p) => ({
      ...p,
      source: "Shopee" as const,
      affiliateUrl: generateShopeeAffiliateLink(p.url),
    }));
  } catch (err) {
    console.error("[shopee-scraper] Error:", err);
    return [];
  } finally {
    await browser.close();
  }
}
