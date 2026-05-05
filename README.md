# PriceWise TH 🇹🇭

**Price comparison website for Shopee Thailand & Lazada Thailand.**

Search for any product and instantly compare prices from both platforms. Every outbound link is converted to an affiliate link, generating commission on clicks and purchases.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Scraping | Playwright (headless Chromium) |
| Database | PostgreSQL |
| Deployment | Vercel or any Node.js VPS |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Install Playwright browsers

```bash
npx playwright install chromium
npx playwright install-deps chromium
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Your PostgreSQL connection string
DATABASE_URL=postgresql://postgres:PASSWORD@103.40.118.129:5432/shopping_comparison

# Shopee TH Affiliate ID — get from https://affiliate.shopee.co.th/
SHOPEE_AFFILIATE_ID=YOUR_SHOPEE_AFFILIATE_ID

# Lazada TH Affiliate — get from https://www.lazada.co.th/lazada-affiliate-program/
LAZADA_AFFILIATE_APP_KEY=YOUR_LAZADA_APP_KEY
LAZADA_AFFILIATE_TRACKING_ID=YOUR_LAZADA_TRACKING_ID

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=PriceWise TH
```

### 4. Set up the database

```bash
npm run db:migrate
```

This creates the `shopping_comparison` database and all tables automatically.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
├── app/
│   ├── layout.tsx                  # Root layout (navbar, footer, metadata)
│   ├── page.tsx                    # Homepage with hero + categories
│   ├── loading.tsx                 # Global loading state
│   ├── not-found.tsx               # 404 page
│   ├── globals.css                 # TailwindCSS base
│   ├── api/
│   │   ├── search/route.ts         # GET /api/search?q=keyword&sort=...
│   │   └── out/route.ts            # GET /api/out?url=...&title=...&source=...
│   └── search/
│       └── [keyword]/page.tsx      # SSR search results page
├── components/
│   ├── SearchBar.tsx               # Search input with trending suggestions
│   ├── ProductCard.tsx             # Product card with image + offer rows
│   ├── OfferRow.tsx                # Single platform offer row
│   ├── ResultsGrid.tsx             # Grid + sort controls
│   ├── PlatformBadge.tsx           # Shopee 🟠 / Lazada 🔵 badge
│   └── PriceBadge.tsx              # "ราคาดีที่สุด" green badge
├── lib/
│   ├── affiliate.ts                # Affiliate link generators
│   ├── cache.ts                    # 15-minute in-memory cache
│   ├── matcher.ts                  # Cross-platform product deduplication
│   └── scrapers/
│       ├── shopee.ts               # Playwright scraper for shopee.co.th
│       └── lazada.ts               # Playwright scraper for lazada.co.th
├── types/
│   └── product.ts                  # TypeScript interfaces
├── database/
│   ├── db.ts                       # PostgreSQL pool + helper functions
│   ├── schema.sql                  # Table definitions
│   └── migrate.js                  # Migration runner
└── .env.local                      # Environment variables (not committed)
```

---

## API Reference

### `GET /api/search`

Searches both platforms and returns merged, sorted results.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | ✅ | — | Search keyword |
| `sort` | string | ❌ | `price_asc` | `price_asc`, `price_desc`, `rating`, `reviews` |

**Response:**
```json
{
  "products": [
    {
      "id": "abc123",
      "title": "iPhone 15 128GB",
      "image": "https://...",
      "offers": [
        {
          "source": "Shopee",
          "price": 29900,
          "rating": 4.8,
          "reviews": 1200,
          "affiliateUrl": "https://shopee.co.th/...",
          "image": "https://..."
        },
        {
          "source": "Lazada",
          "price": 30500,
          "rating": 4.5,
          "reviews": 800,
          "affiliateUrl": "https://c.lazada.co.th/...",
          "image": "https://..."
        }
      ],
      "bestPrice": 29900,
      "bestSource": "Shopee"
    }
  ],
  "query": "iphone 15",
  "cached": false,
  "totalResults": 15
}
```

### `GET /api/out`

Logs the click and redirects to the affiliate URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | Encoded affiliate URL |
| `title` | string | ❌ | Product title (for analytics) |
| `source` | string | ❌ | `Shopee` or `Lazada` |

---

## Affiliate Setup

### Shopee Thailand
1. Sign up at [https://affiliate.shopee.co.th/](https://affiliate.shopee.co.th/)
2. Wait for approval (usually 1–3 business days)
3. In the dashboard, copy your **Affiliate ID / Tracking Code**
4. Set `SHOPEE_AFFILIATE_ID` in `.env.local`
5. Update `lib/affiliate.ts` → `generateShopeeAffiliateLink()` with the exact URL format from your dashboard

### Lazada Thailand
1. Sign up at [https://www.lazada.co.th/lazada-affiliate-program/](https://www.lazada.co.th/lazada-affiliate-program/)
2. Once approved, get your **App Key** and **Tracking ID**
3. Set `LAZADA_AFFILIATE_APP_KEY` and `LAZADA_AFFILIATE_TRACKING_ID` in `.env.local`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `products` | Normalized product records |
| `offers` | Price offers per product per platform |
| `clicks` | Click events (affiliate analytics) |
| `search_logs` | Search query logs (for SEO insights) |

### View click analytics

```sql
-- Total clicks per platform (last 30 days)
SELECT source, COUNT(*) as clicks
FROM clicks
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY source;

-- Top clicked products
SELECT product_title, COUNT(*) as clicks
FROM clicks
GROUP BY product_title
ORDER BY clicks DESC
LIMIT 20;

-- Top searches
SELECT query, COUNT(*) as searches
FROM search_logs
GROUP BY query
ORDER BY searches DESC
LIMIT 20;
```

---

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard under **Settings → Environment Variables**.

> ⚠️ Playwright (headless browser) does NOT work on Vercel's serverless functions.
> For production scraping, use one of the alternatives below.

### VPS / Dedicated Server (Recommended for scraping)

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chromium dependencies
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2

# Clone and install
git clone your-repo
cd your-repo
npm install
npx playwright install chromium

# Set up environment
cp .env.example .env.local
nano .env.local   # fill in your values

# Run migrations
npm run db:migrate

# Build and start
npm run build
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "pricewise" -- start
pm2 save
pm2 startup
```

### Hybrid: Vercel Frontend + External Scraper API

If you deploy the frontend on Vercel but need real scraping, you can:
1. Deploy a separate Express/Fastify server on a VPS that runs Playwright
2. Point `NEXT_PUBLIC_SCRAPER_API_URL` to that server
3. The `/api/search` route calls the external scraper instead of running Playwright inline

---

## Performance Notes

- Search results are cached in memory for **15 minutes** (see `lib/cache.ts`)
- Both platforms are scraped **concurrently** with `Promise.allSettled` — if one fails, you still get the other's results
- Product matching uses **Jaccard similarity** on word sets — tune `MATCH_THRESHOLD` in `lib/matcher.ts`
- All DB writes (clicks, search logs) are **fire-and-forget** — they don't block the response

---

## SEO

Each search creates a crawlable URL: `/search/iphone-15`, `/search/air-fryer`, etc.

- Server-side rendered with `generateMetadata()`
- JSON-LD structured data (`ItemList` + `Product` + `AggregateOffer`)
- Canonical URLs
- 15-minute ISR revalidation

---

## License

MIT — use freely, contribute improvements back.
