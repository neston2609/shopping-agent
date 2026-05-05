import type { RawProduct, Product, Offer } from "@/types/product";

// Simple string similarity using Jaccard index on word sets
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

// Threshold above which two products are considered the same
const MATCH_THRESHOLD = 0.35;

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function mergeProducts(rawProducts: RawProduct[]): Product[] {
  // Separate by platform
  const shopeeItems = rawProducts.filter((p) => p.source === "Shopee");
  const lazadaItems = rawProducts.filter((p) => p.source === "Lazada");

  const products: Product[] = [];

  // Try to pair each Shopee item with a Lazada counterpart
  const usedLazada = new Set<number>();

  for (const shopeeItem of shopeeItems) {
    let bestMatch: RawProduct | null = null;
    let bestScore = 0;
    let bestIdx = -1;

    lazadaItems.forEach((lazItem, idx) => {
      if (usedLazada.has(idx)) return;
      const score = similarity(shopeeItem.title, lazItem.title);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = lazItem;
        bestIdx = idx;
      }
    });

    const offers: Offer[] = [
      {
        source: "Shopee",
        price: shopeeItem.price,
        rating: shopeeItem.rating,
        reviews: shopeeItem.reviews,
        affiliateUrl: shopeeItem.affiliateUrl,
        image: shopeeItem.image,
      },
    ];

    if (bestMatch && bestScore >= MATCH_THRESHOLD) {
      usedLazada.add(bestIdx);
      offers.push({
        source: "Lazada",
        price: bestMatch.price,
        rating: bestMatch.rating,
        reviews: bestMatch.reviews,
        affiliateUrl: bestMatch.affiliateUrl,
        image: bestMatch.image,
      });
    }

    const prices = offers.map((o) => o.price);
    const bestPrice = Math.min(...prices);
    const bestOffer = offers.find((o) => o.price === bestPrice)!;

    products.push({
      id: makeId(),
      title: shopeeItem.title,
      image: shopeeItem.image || (bestMatch?.image ?? ""),
      offers,
      bestPrice,
      bestSource: bestOffer.source,
    });
  }

  // Add unmatched Lazada items as solo cards
  lazadaItems.forEach((lazItem, idx) => {
    if (usedLazada.has(idx)) return;
    products.push({
      id: makeId(),
      title: lazItem.title,
      image: lazItem.image,
      offers: [
        {
          source: "Lazada",
          price: lazItem.price,
          rating: lazItem.rating,
          reviews: lazItem.reviews,
          affiliateUrl: lazItem.affiliateUrl,
          image: lazItem.image,
        },
      ],
      bestPrice: lazItem.price,
      bestSource: "Lazada",
    });
  });

  return products;
}
