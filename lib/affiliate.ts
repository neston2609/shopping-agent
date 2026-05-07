/**
 * Affiliate link generators.
 *
 * IDs are read from the database (admin_config table) so they can be updated
 * via the admin dashboard without redeploying.  .env values are used as
 * fallbacks only (e.g. before the first DB save).
 */
import type { Platform } from "@/types/product";
import { getConfig } from "@/lib/admin-config";

// ─── Shopee TH ────────────────────────────────────────────────────────────────
// Sign up: https://affiliate.shopee.co.th/
//
// TODO: Once you have API access from Shopee, replace the URL-param approach
//       below with a real short-link API call:
//       POST https://affiliate.shopee.co.th/api/v2/offer/generate_affiliate_link
export async function generateShopeeAffiliateLink(originalUrl: string): Promise<string> {
  const affiliateId = await getConfig(
    "shopee_affiliate_id",
    process.env.SHOPEE_AFFILIATE_ID ?? ""
  );

  if (!affiliateId) return originalUrl; // No ID configured yet → passthrough

  try {
    const url = new URL(originalUrl);
    url.searchParams.set("smtt", "0.0.9");
    url.searchParams.set("affiliate_id", affiliateId);
    return url.toString();
  } catch {
    return originalUrl;
  }
}

// ─── Lazada TH ────────────────────────────────────────────────────────────────
// Affiliate tracking: append ?sub_aff_id=<TRACKING_ID> to the product URL.
// Example result: https://www.lazada.co.th/products/xxx.html?sub_aff_id=150041147
//
// The tracking ID is the numeric publisher/sub-affiliate ID shown in your
// Lazada affiliate dashboard.  Stored as lazada_tracking_id in admin_config.
export async function generateLazadaAffiliateLink(originalUrl: string): Promise<string> {
  const trackingId = await getConfig(
    "lazada_tracking_id",
    process.env.LAZADA_AFFILIATE_TRACKING_ID ?? ""
  );

  if (!trackingId) return originalUrl; // Not configured yet

  try {
    const url = new URL(originalUrl);
    url.searchParams.set("sub_aff_id", trackingId);
    return url.toString();
  } catch {
    return originalUrl;
  }
}

// ─── Unified entry point ──────────────────────────────────────────────────────
export async function generateAffiliateLink(
  source: Platform,
  url: string
): Promise<string> {
  if (source === "Shopee") return generateShopeeAffiliateLink(url);
  if (source === "Lazada") return generateLazadaAffiliateLink(url);
  return url;
}
