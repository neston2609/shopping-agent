import { NextResponse } from "next/server";
import pool from "@/database/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalClicksRes,
      todayClicksRes,
      platformClicksRes,
      topProductsRes,
      topSearchesRes,
      recentClicksRes,
    ] = await Promise.all([
      // Total all-time clicks
      pool.query<{ count: string }>("SELECT COUNT(*) FROM clicks"),

      // Clicks today
      pool.query<{ count: string }>(
        "SELECT COUNT(*) FROM clicks WHERE timestamp > NOW() - INTERVAL '24 hours'"
      ),

      // Clicks by platform (last 30 days)
      pool.query<{ source: string; count: string }>(
        `SELECT source, COUNT(*) as count FROM clicks
         WHERE timestamp > NOW() - INTERVAL '30 days'
         GROUP BY source ORDER BY count DESC`
      ),

      // Top clicked products (last 30 days)
      pool.query<{ product_title: string; count: string }>(
        `SELECT product_title, COUNT(*) as count FROM clicks
         WHERE timestamp > NOW() - INTERVAL '30 days' AND product_title IS NOT NULL
         GROUP BY product_title ORDER BY count DESC LIMIT 10`
      ),

      // Top searches (last 30 days)
      pool.query<{ query: string; count: string }>(
        `SELECT query, COUNT(*) as count FROM search_logs
         WHERE timestamp > NOW() - INTERVAL '30 days'
         GROUP BY query ORDER BY count DESC LIMIT 10`
      ),

      // Last 20 click events
      pool.query<{
        id: number;
        product_title: string;
        source: string;
        timestamp: string;
      }>(
        `SELECT id, product_title, source, timestamp FROM clicks
         ORDER BY timestamp DESC LIMIT 20`
      ),
    ]);

    return NextResponse.json({
      totalClicks: parseInt(totalClicksRes.rows[0].count),
      todayClicks: parseInt(todayClicksRes.rows[0].count),
      byPlatform: platformClicksRes.rows.map((r) => ({
        source: r.source,
        count: parseInt(r.count),
      })),
      topProducts: topProductsRes.rows.map((r) => ({
        title: r.product_title,
        count: parseInt(r.count),
      })),
      topSearches: topSearchesRes.rows.map((r) => ({
        query: r.query,
        count: parseInt(r.count),
      })),
      recentClicks: recentClicksRes.rows,
    });
  } catch (err) {
    console.error("[admin/analytics]", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
