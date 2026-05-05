/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.shopee.co.th" },
      { protocol: "https", hostname: "**.lazada.co.th" },
      { protocol: "https", hostname: "cf.shopee.co.th" },
      { protocol: "https", hostname: "**.alicdn.com" },
      { protocol: "https", hostname: "sg-live.slatic.net" },
      { protocol: "https", hostname: "**.slatic.net" }
    ]
  }
};

module.exports = nextConfig;
