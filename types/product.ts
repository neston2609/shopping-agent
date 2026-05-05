export type Platform = "Shopee" | "Lazada";

export interface RawProduct {
  title: string;
  price: number;
  image: string;
  rating: number | null;
  reviews: number | null;
  url: string;
  source: Platform;
  affiliateUrl: string;
}

export interface Offer {
  source: Platform;
  price: number;
  rating: number | null;
  reviews: number | null;
  affiliateUrl: string;
  image: string;
}

export interface Product {
  id: string;
  title: string;
  image: string;
  offers: Offer[];
  bestPrice: number;
  bestSource: Platform;
}

export interface SearchResponse {
  products: Product[];
  query: string;
  cached: boolean;
  totalResults: number;
}

export type SortOption = "price_asc" | "price_desc" | "rating" | "reviews";
