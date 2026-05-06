"use client";

import { useState } from "react";
import type { Offer } from "@/types/product";
import PlatformBadge from "./PlatformBadge";
import PriceBadge from "./PriceBadge";

interface OfferRowProps {
  offer: Offer;
  isBest: boolean;
  productTitle: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-yellow-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          {i < full ? (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          ) : i === full && half ? (
            <path d="M10 1l2.39 5.26 5.61.49-4.18 3.71 1.35 5.54L10 13.27l-5.17 2.73 1.35-5.54L2 6.75l5.61-.49L10 1zm0 2.46v7.81l3.26 1.72-.85-3.49 2.64-2.34-3.53-.31L10 3.46z" />
          ) : (
            <path
              fillRule="evenodd"
              d="M10 1l2.39 5.26 5.61.49-4.18 3.71 1.35 5.54L10 13.27l-5.17 2.73 1.35-5.54L2 6.75l5.61-.49L10 1zm0 2.46l-1.58 3.47-3.53.31 2.64 2.34-.85 3.49L10 11.3l3.32 1.77-.85-3.49 2.64-2.34-3.53-.31L10 3.46z"
              clipRule="evenodd"
            />
          )}
        </svg>
      ))}
      <span className="text-gray-500 text-xs ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function buildOutUrl(offer: Offer, productTitle: string): string {
  return (
    `/api/out?url=${encodeURIComponent(offer.affiliateUrl)}` +
    `&title=${encodeURIComponent(productTitle)}` +
    `&source=${offer.source}`
  );
}

/**
 * Resolve the best shareable URL from an affiliate link.
 *
 * Lazada short-links (c.lazada.co.th/t/...) redirect to the homepage when
 * the affiliate account is not yet fully activated.  The real product URL is
 * already encoded in the short-link's ?url= param, so we extract it directly.
 * Once the affiliate account is live the short-link will work on its own —
 * at that point this helper can be removed or turned into a no-op.
 */
function resolveShareUrl(affiliateUrl: string): string {
  try {
    const parsed = new URL(affiliateUrl);
    if (
      parsed.hostname === "c.lazada.co.th" &&
      parsed.pathname.startsWith("/t/")
    ) {
      const inner = parsed.searchParams.get("url");
      if (inner) return inner; // e.g. https://www.lazada.co.th/products/...
    }
  } catch { /* fall through */ }
  return affiliateUrl;
}

function CopyLinkButton({ affiliateUrl }: { affiliateUrl: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(resolveShareUrl(affiliateUrl));
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="คัดลอก Affiliate Link"
      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
        state === "copied"
          ? "border-green-400 bg-green-50 text-green-600"
          : state === "error"
          ? "border-red-300 bg-red-50 text-red-500"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700"
      }`}
    >
      {state === "copied" ? (
        <>
          {/* Checkmark icon */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          คัดลอกแล้ว!
        </>
      ) : state === "error" ? (
        <>
          {/* X icon */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          ลองใหม่
        </>
      ) : (
        <>
          {/* Copy icon */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          คัดลอก Link
        </>
      )}
    </button>
  );
}

export default function OfferRow({ offer, isBest, productTitle }: OfferRowProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        isBest
          ? "border-green-300 bg-green-50"
          : "border-gray-100 bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={offer.source} size="sm" />
          {isBest && <PriceBadge />}
        </div>
        {offer.rating !== null && <StarRating rating={offer.rating} />}
        {offer.reviews !== null && (
          <span className="text-xs text-gray-400">
            {offer.reviews.toLocaleString("th-TH")} รีวิว
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <span
          className={`text-lg font-bold ${
            isBest ? "text-green-600" : "text-gray-800"
          }`}
        >
          {formatPrice(offer.price)}
        </span>
        <a
          href={buildOutUrl(offer, productTitle)}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
            offer.source === "Shopee"
              ? "bg-shopee text-white hover:bg-shopee-dark"
              : "bg-lazada text-white hover:bg-lazada-dark"
          }`}
        >
          ดูสินค้า →
        </a>
        <CopyLinkButton affiliateUrl={offer.affiliateUrl} />
      </div>
    </div>
  );
}
