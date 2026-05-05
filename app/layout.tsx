import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "PriceWise TH";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pricewise.th";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — เปรียบเทียบราคา Shopee & Lazada`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "เปรียบเทียบราคาสินค้าจาก Shopee และ Lazada ในที่เดียว หาราคาถูกที่สุดได้ง่ายๆ",
  keywords: ["เปรียบเทียบราคา", "shopee", "lazada", "ราคาถูก", "ซื้อของออนไลน์"],
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "th_TH",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        {/* Navbar */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {SITE_NAME}
            </Link>

            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/" className="hover:text-blue-600 transition-colors">
                หน้าแรก
              </Link>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-shopee" />
                <span className="hidden sm:inline">Shopee</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lazada" />
                <span className="hidden sm:inline">Lazada</span>
              </span>
            </nav>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
            <p>
              {SITE_NAME} — เปรียบเทียบราคาจาก Shopee และ Lazada · ไม่มีค่าใช้จ่าย
            </p>
            <p className="mt-1 text-xs">
              ลิงก์สินค้าในเว็บไซต์นี้เป็น affiliate link · เราอาจได้รับค่าคอมมิชชั่นจากการซื้อขาย
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
