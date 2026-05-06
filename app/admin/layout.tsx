import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — PriceWise TH",
  robots: { index: false, follow: false },
};

// Admin uses its own layout — no public navbar/footer
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
