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
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "th-TH",
    extraHTTPHeaders: {
      "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    },
  });

  const page = await context.newPage();

  try {
    const searchUrl = `${LAZADA_BASE}/catalog/?q=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: TIMEOUT });

    // Wait for product cards
    await page
      .waitForSelector('[data-qa-locator="product-item"]', { timeout: TIMEOUT })
      .catch(() =>
        page.waitForSelector(".Bm3ON", { timeout: 10_000 }).catch(() => null)
      );

    await page.waitForTimeout(2000);

    const products = await page.evaluate((maxResults: number) => {
      // Lazada product cards
      const selectors = [
        '[data-qa-locator="product-item"]',
        ".Bm3ON",
        "[class*='product-card']",
      ];

      let items: Element[] = [];
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length > 0) {
          items = found.slice(0, maxResults);
          break;
        }
      }

      return items
        .map((item) => {
          try {
            // Title
            const titleEl =
              item.querySelector("[class*='RfADt'] a") ??
              item.querySelector("[class*='title']") ??
              item.querySelector("a[title]");
            const title =
              titleEl?.getAttribute("title") ??
              titleEl?.textContent?.trim() ??
              "";

            // Price
            const priceEl =
              item.querySelector("[class*='price'] span") ??
              item.querySelector("[class*='Price']");
            const priceText =
              priceEl?.textContent?.replace(/[^0-9.]/g, "") ?? "0";
            const price = parseFloat(priceText) || 0;

            // Image
            const imgEl = item.querySelector("img");
            let image =
              imgEl?.getAttribute("src") ??
              imgEl?.getAttribute("data-src") ??
              "";
            if (image.startsWith("//")) image = "https:" + image;

            // Rating — Lazada shows stars as aria-label or text
            const ratingEl =
              item.querySelector("[class*='rating']") ??
              item.querySelector("[aria-label*='star']");
            const ratingText =
              ratingEl?.getAttribute("aria-label")?.match(/[\d.]+/)?.[0] ??
              ratingEl?.textContent?.trim() ??
              "";
            const rating = ratingText ? parseFloat(ratingText) || null : null;

            // Reviews / sold count
            const reviewEl =
              item.querySelector("[class*='review']") ??
              item.querySelector("[class*='sold']");
            const reviewText =
              reviewEl?.textContent?.replace(/[^0-9]/g, "") ?? "";
            const reviews = reviewText ? parseInt(reviewText) : null;

            // URL
            const linkEl =
              item.querySelector("a[href*='lazada.co.th']") ??
              item.querySelector("a");
            const href = linkEl?.getAttribute("href") ?? "";
            const url = href.startsWith("http")
              ? href
              : `https://www.lazada.co.th${href}`;

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
