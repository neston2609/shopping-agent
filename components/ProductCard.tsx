"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";
import OfferRow from "./OfferRow";

interface ProductCardProps {
  product: Product;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 animate-slide-up flex flex-col">
      {/* Product image */}
      <div className="relative w-full aspect-square bg-gray-50">
        {!imgError && product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-contain p-4"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Best price badge */}
        {product.offers.length > 1 && (
          <div className="absolute top-2 left-2">
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
              เปรียบเทียบ 2 ร้าน
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
          {product.title}
        </h3>

        {/* Best price summary */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">ราคาดีที่สุด</span>
          <span className="text-xl font-bold text-gray-900">
            {formatPrice(product.bestPrice)}
          </span>
        </div>

        {/* Offer rows */}
        <div className="flex flex-col gap-2 mt-auto">
          {product.offers
            .sort((a, b) => a.price - b.price)
            .map((offer) => (
              <OfferRow
                key={offer.source}
                offer={offer}
                isBest={offer.price === product.bestPrice}
                productTitle={product.title}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
