import type { Platform } from "@/types/product";

// ============================================================
// TODO: Replace placeholder IDs with your real affiliate IDs
//       after joining the programs below.
//
//  Shopee TH Affiliate: https://affiliate.shopee.co.th/
//  Lazada TH Affiliate: https://www.lazada.co.th/lazada-affiliate-program/
// ============================================================

const SHOPEE_AFFILIATE_ID =
  process.env.SHOPEE_AFFILIATE_ID ?? "YOUR_SHOPEE_AFFILIATE_ID";

const LAZADA_APP_KEY =
  process.env.LAZADA_AFFILIATE_APP_KEY ?? "YOUR_LAZADA_APP_KEY";

const LAZADA_TRACKING_ID =
  process.env.LAZADA_AFFILIATE_TRACKING_ID ?? "YOUR_LAZADA_TRACKING_ID";

// ----------------------------------------------------------
// Shopee TH affiliate link
// Format: https://s.shopee.co.th/<affiliate_id>?smtt=0.0.9
// Then deep-link to the product via `u` param
// ----------------------------------------------------------
export function generateShopeeAffiliateLink(originalUrl: string): string {
  // TODO: Shopee may require you to generate short links via their API.
  // Once you have API access, replace this with a real API call.
  // Docs: https://affiliate.shopee.co.th/offer/generate_affiliate_link
  //
  // Interim approach: append affiliate sub-id as a query param.
  try {
    const url = new URL(originalUrl);
    url.searchParams.set("smtt", "0.0.9");
    url.searchParams.set("affiliate_id", SHOPEE_AFFILIATE_ID);
    return url.toString();
  } catch {
    return originalUrl;
  }
}

// ----------------------------------------------------------
// Lazada TH affiliate link
// Lazada uses AccessTrade or their own affiliate portal.
// Standard format:
//   https://c.lazada.co.th/t/c.<APP_KEY>.<TRACKING_ID>/?url=<encoded_product_url>
// ----------------------------------------------------------
export function generateLazadaAffiliateLink(originalUrl: string): string {
  // TODO: Replace with actual Lazada affiliate deep-link format once you
  // have your app key and tracking ID from the Lazada Affiliate Portal.
  // Docs: https://affiliate.lazada.co.th/
  const encodedUrl = encodeURIComponent(originalUrl);
  return `https://c.lazada.co.th/t/c.${LAZADA_APP_KEY}.${LAZADA_TRACKING_ID}/?url=${encodedUrl}`;
}

// ----------------------------------------------------------
// Unified entry point used throughout the app
// ----------------------------------------------------------
export function generateAffiliateLink(
  source: Platform,
  url: string
): string {
  if (source === "Shopee") return generateShopeeAffiliateLink(url);
  if (source === "Lazada") return generateLazadaAffiliateLink(url);
  return url;
}
