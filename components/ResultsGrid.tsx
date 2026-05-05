"use client";

import { useState } from "react";
import type { Product, SortOption } from "@/types/product";
import ProductCard from "./ProductCard";

interface ResultsGridProps {
  products: Product[];
  query: string;
  cached: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "price_asc", label: "ราคา: ต่ำ → สูง" },
  { value: "price_desc", label: "ราคา: สูง → ต่ำ" },
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "reviews", label: "รีวิวมากที่สุด" },
];

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
    }
  });
}

export default function ResultsGrid({ products, query, cached }: ResultsGridProps) {
  const [sort, setSort] = useState<SortOption>("price_asc");
  const sorted = sortProducts(products, sort);

  const twoOffer = sorted.filter((p) => p.offers.length >= 2).length;

  return (
    <div className="w-full">
      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            พบ {products.length} สินค้า สำหรับ &ldquo;{query}&rdquo;
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {twoOffer > 0 && `${twoOffer} สินค้าเปรียบเทียบได้ 2 แพลตฟอร์ม · `}
            {cached ? (
              <span className="text-blue-500">⚡ จากแคช</span>
            ) : (
              <span className="text-green-500">🔄 ข้อมูลใหม่</span>
            )}
          </p>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">เรียงตาม:</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-blue-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium">ไม่พบสินค้า</p>
          <p className="text-sm mt-1">ลองค้นหาด้วยคำอื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
