import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireApiPermission } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireApiPermission("livestream.manage");
  if (error) return error;

  const body = await req.json();
  const { livestream_id, product_id, keyword, price_override, max_quantity, priority, reserve_stock } = body;
  if (!livestream_id || !product_id || !keyword) return NextResponse.json({ error: "livestream_id, product_id, keyword required" }, { status: 400 });
  const result = await db.prepare(`
    INSERT INTO live_products (livestream_id, product_id, keyword, price_override, max_quantity, priority, reserve_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(livestream_id, product_id, keyword, price_override || null, max_quantity || null, priority || 0, reserve_stock || 0);
  revalidatePath("/livestream");
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireApiPermission("livestream.manage");
  if (error) return error;

  const body = await req.json();
  const { id, keyword, price_override, max_quantity, priority, reserve_stock } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.prepare("UPDATE live_products SET keyword=?, price_override=?, max_quantity=?, priority=?, reserve_stock=? WHERE id=?")
    .run(keyword, price_override || null, max_quantity || null, priority || 0, reserve_stock || 0, id);
  revalidatePath("/livestream");
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireApiPermission("livestream.manage");
  if (error) return error;

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.prepare("DELETE FROM live_products WHERE id = ?").run(id);
  revalidatePath("/livestream");
  return NextResponse.json({ success: true });
}
