-- ============================================================
-- PriceWise TH — Database Schema
-- Run: psql $DATABASE_URL -f database/schema.sql
-- ============================================================

CREATE DATABASE shopping_comparison;
\c shopping_comparison;

-- Products (normalized, deduplicated)
CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  image            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_normalized_title ON products (normalized_title);

-- Offers — one row per product × platform
CREATE TABLE IF NOT EXISTS offers (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER REFERENCES products(id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN ('Shopee', 'Lazada')),
  price         NUMERIC(12, 2) NOT NULL,
  rating        NUMERIC(3, 1),
  reviews       INTEGER,
  affiliate_url TEXT NOT NULL,
  scraped_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_product_id ON offers (product_id);
CREATE INDEX IF NOT EXISTS idx_offers_source     ON offers (source);

-- Click events (affiliate monetisation analytics)
CREATE TABLE IF NOT EXISTS clicks (
  id            SERIAL PRIMARY KEY,
  product_title TEXT,
  source        TEXT,
  affiliate_url TEXT NOT NULL,
  user_ip       INET,
  user_agent    TEXT,
  referer       TEXT,
  timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_source    ON clicks (source);

-- Search logs (to discover popular queries for SEO pages)
CREATE TABLE IF NOT EXISTS search_logs (
  id         SERIAL PRIMARY KEY,
  query      TEXT NOT NULL,
  results    INTEGER DEFAULT 0,
  cached     BOOLEAN DEFAULT FALSE,
  user_ip    INET,
  timestamp  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_query     ON search_logs (query);
CREATE INDEX IF NOT EXISTS idx_search_logs_timestamp ON search_logs (timestamp DESC);

-- Admin config — key/value store for affiliate IDs, password hash, etc.
CREATE TABLE IF NOT EXISTS admin_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin password hash for "admin1234"
-- (The actual hash is generated at first boot by the migrate script)
-- Affiliate ID placeholders — admin fills these in via the dashboard
INSERT INTO admin_config (key, value) VALUES
  ('shopee_affiliate_id',      '')
  ,('lazada_app_key',          '')
  ,('lazada_tracking_id',      '')
ON CONFLICT (key) DO NOTHING;
