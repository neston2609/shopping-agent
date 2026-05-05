import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ResultsGrid from "@/components/ResultsGrid";
import { getCached, setCached } from "@/lib/cache";
import { scrapeShopee } from "@/lib/scrapers/shopee";
import { scrapeLazada } from "@/lib/scrapers/lazada";
import { mergeProducts } from "@/lib/matcher";
import type { Product } from "@/types/product";

interface Props {
  params: { keyword: string };
  searchParams: { sort?: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pricewise.th";

// Revalidate every 15 minutes (matches cache TTL)
export const revalidate = 900;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const keyword = decodeURIComponent(params.keyword);
  return {
    title: `${keyword} — เปรียบเทียบราคา Shopee & Lazada`,
    description: `เปรียบเทียบราคา ${keyword} จาก Shopee และ Lazada ค้นหาราคาถูกที่สุดในไทย`,
    keywords: [keyword, "ราคาถูก", "shopee", "lazada", "เปรียบเทียบราคา"],
    alternates: {
      canonical: `${SITE_URL}/search/${params.keyword}`,
    },
    openGraph: {
      title: `${keyword} — ราคาถูกที่สุดจาก Shopee & Lazada`,
      description: `เปรียบเทียบราคา ${keyword} จาก Shopee และ Lazada`,
      url: `${SITE_URL}/search/${params.keyword}`,
      type: "website",
    },
  };
}

async function getProducts(keyword: string): Promise<{ products: Product[]; cached: boolean }> {
  // Try cache first
  const cached = getCached(keyword);
  if (cached) return { products: cached, cached: true };

  // Scrape both platforms concurrently; handle partial failures
  const [shopeeResult, lazadaResult] = await Promise.allSettled([
    scrapeShopee(keyword),
    scrapeLazada(keyword),
  ]);

  if (shopeeResult.status === "rejected") {
    console.error("[search-page] Shopee scrape failed:", shopeeResult.reason);
  }
  if (lazadaResult.status === "rejected") {
    console.error("[search-page] Lazada scrape failed:", lazadaResult.reason);
  }

  const allRaw = [
    ...(shopeeResult.status === "fulfilled" ? shopeeResult.value : []),
    ...(lazadaResult.status === "fulfilled" ? lazadaResult.value : []),
  ];

  if (allRaw.length === 0) return { products: [], cached: false };

  const merged = mergeProducts(allRaw);
  setCached(keyword, merged);
  return { products: merged, cached: false };
}

export default async function SearchPage({ params }: Props) {
  const keyword = decodeURIComponent(params.keyword);

  if (!keyword || keyword.trim().length < 2) {
    notFound();
  }

  const { products, cached } = await getProducts(keyword);

  // JSON-LD structured data for Google Shopping
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${keyword} — เปรียบเทียบราคา`,
    description: `เปรียบเทียบราคา ${keyword} จาก Shopee และ Lazada`,
    url: `${SITE_URL}/search/${params.keyword}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 10).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.title,
        image: product.image,
        offers: {
          "@type": "AggregateOffer",
          lowPrice: product.bestPrice,
          priceCurrency: "THB",
          offerCount: product.offers.length,
          offers: product.offers.map((offer) => ({
            "@type": "Offer",
            price: offer.price,
            priceCurrency: "THB",
            seller: { "@type": "Organization", name: offer.source },
          })),
        },
      },
    })),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar (pre-filled) */}
        <div className="mb-8">
          <SearchBar defaultValue={keyword} />
        </div>

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-blue-600 transition-colors">
            หน้าแรก
          </a>
          <span className="mx-2">›</span>
          <span className="text-gray-800 font-medium">{keyword}</span>
        </nav>

        {products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              ไม่พบผลลัพธ์สำหรับ &ldquo;{keyword}&rdquo;
            </h2>
            <p className="text-gray-500 mb-6">
              Shopee และ Lazada อาจไม่มีสินค้านี้ หรือเกิดข้อผิดพลาดในการดึงข้อมูล
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              กลับหน้าแรก
            </a>
          </div>
        ) : (
          <ResultsGrid products={products} query={keyword} cached={cached} />
        )}
      </div>
    </>
  );
}
