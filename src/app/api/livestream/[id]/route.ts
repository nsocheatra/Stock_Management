import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stream = await db.prepare("SELECT * FROM livestreams WHERE id = ?").get(parseInt(id));
  if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const products = await db.prepare(`
    SELECT lp.*, p.name as product_name, p.sku as product_sku, p.price as product_price, p.image_url as product_image, p.quantity as stock,
      (SELECT COALESCE(SUM(quantity), 0) FROM live_order_items loi JOIN live_orders lo ON loi.order_id = lo.id WHERE loi.product_id = lp.product_id AND lo.livestream_id = lp.livestream_id) as sold
    FROM live_products lp JOIN products p ON lp.product_id = p.id
    WHERE lp.livestream_id = ? ORDER BY lp.priority DESC
  `).all(parseInt(id));
  const comments = await db.prepare("SELECT * FROM live_comments WHERE livestream_id = ? ORDER BY created_at DESC LIMIT 100").all(parseInt(id));
  const orders = await db.prepare("SELECT * FROM live_orders WHERE livestream_id = ? ORDER BY created_at DESC").all(parseInt(id));
  return NextResponse.json({ ...stream, products, comments, orders });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (["title", "description", "facebook_page_id", "status", "scheduled_at", "viewer_count", "comment_count", "order_count", "revenue"].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  fields.push("updated_at = datetime('now')");
  values.push(parseInt(id));
  await db.prepare(`UPDATE livestreams SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  revalidatePath("/livestream");
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.prepare("DELETE FROM livestreams WHERE id = ?").run(parseInt(id));
  revalidatePath("/livestream");
  return NextResponse.json({ success: true });
}
