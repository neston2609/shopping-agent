import { NextRequest, NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/cache";
import { scrapeShopee } from "@/lib/scrapers/shopee";
import { scrapeLazada } from "@/lib/scrapers/lazada";
import { mergeProducts } from "@/lib/matcher";
import { logSearch } from "@/database/db";
import type { SortOption, Product } from "@/types/product";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel hobby limit

function sortProducts(products: Product[], sort: SortOption): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.bestPrice - b.bestPrice;
      case "price_desc":
        return b.bestPrice - a.bestPrice;
      case "rating": {
        const rA = Math.max(...a.offers.map((o) => o.rating ?? 0));
        const rB = Math.max(...b.offers.map((o) => o.rating ?? 0));
        return rB - rA;
      }
      case "reviews": {
        const rvA = a.offers.reduce((s, o) => s + (o.reviews ?? 0), 0);
        const rvB = b.offers.reduce((s, o) => s + (o.reviews ?? 0), 0);
        return rvB - rvA;
      }
      default:
        return 0;
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const sort = (searchParams.get("sort") as SortOption) || "price_asc";

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  // Check cache
  const cached = getCached(q);
  if (cached) {
    const sorted = sortProducts(cached, sort);
    const userIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;
    void logSearch({ query: q, results: sorted.length, cached: true, userIp });
    return NextResponse.json({
      products: sorted,
      query: q,
      cached: true,
      totalResults: sorted.length,
    });
  }

  // Scrape both platforms concurrently; handle partial failures
  const [shopeeResults, lazadaResults] = await Promise.allSettled([
    scrapeShopee(q),
    scrapeLazada(q),
  ]);

  const shopeeProducts =
    shopeeResults.status === "fulfilled" ? shopeeResults.value : [];
  const lazadaProducts =
    lazadaResults.status === "fulfilled" ? lazadaResults.value : [];

  if (shopeeResults.status === "rejected") {
    console.error("[api/search] Shopee scrape failed:", shopeeResults.reason);
  }
  if (lazadaResults.status === "rejected") {
    console.error("[api/search] Lazada scrape failed:", lazadaResults.reason);
  }

  const allRaw = [...shopeeProducts, ...lazadaProducts];

  if (allRaw.length === 0) {
    return NextResponse.json({
      products: [],
      query: q,
      cached: false,
      totalResults: 0,
    });
  }

  const merged = mergeProducts(allRaw);
  setCached(q, merged);

  const sorted = sortProducts(merged, sort);

  const userIp =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;
  void logSearch({ query: q, results: sorted.length, cached: false, userIp });

  return NextResponse.json({
    products: sorted,
    query: q,
    cached: false,
    totalResults: sorted.length,
  });
}
