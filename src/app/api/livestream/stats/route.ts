import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireApiPermission("livestream.manage");
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const livestream_id = searchParams.get("livestream_id");
  if (!livestream_id) return NextResponse.json({ error: "livestream_id required" }, { status: 400 });

  const id = parseInt(livestream_id);
  const stream = await db.prepare("SELECT * FROM livestreams WHERE id = ?").get(id) as any;
  if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recentOrders = await db.prepare("SELECT COUNT(*) as count FROM live_orders WHERE livestream_id = ? AND created_at > datetime('now', '-1 hour')").get(id) as { count: number };
  const topProduct = await db.prepare(`
    SELECT loi.product_name, SUM(loi.quantity) as total_qty
    FROM live_order_items loi JOIN live_orders lo ON loi.order_id = lo.id
    WHERE lo.livestream_id = ? AND lo.status != 'cancelled'
    GROUP BY loi.product_id ORDER BY total_qty DESC LIMIT 1
  `).get(id) as { product_name: string; total_qty: number } | undefined;

  const totalViewers = stream.viewer_count;
  const totalComments = stream.comment_count;
  const totalOrders = stream.order_count;
  const conversionRate = totalViewers > 0 ? ((totalOrders / totalViewers) * 100).toFixed(1) : "0";

  return NextResponse.json({
    viewers: totalViewers,
    comments: totalComments,
    orders: totalOrders,
    revenue: stream.revenue,
    conversion_rate: parseFloat(conversionRate),
    top_product: topProduct?.product_name || null,
    orders_per_minute: recentOrders.count / 60,
  });
}
