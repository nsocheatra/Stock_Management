import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireApiAuth();
  if (error) return error;
  const orders = await db.prepare(`
    SELECT lo.*, u.name as driver_name
    FROM live_orders lo LEFT JOIN users u ON lo.driver_id = u.id
    WHERE lo.status IN ('packed', 'delivery')
    ORDER BY lo.created_at ASC
  `).all();
  return NextResponse.json(orders);
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireApiAuth();
  if (error) return error;

  const body = await req.json();
  const { id, driver_id, status } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.prepare("UPDATE live_orders SET driver_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(driver_id || null, status || "delivery", id);
  return NextResponse.json({ success: true });
}
