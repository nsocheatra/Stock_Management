import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireApiAuth();
  if (error) return error;
  const body = await req.json();
  const { livestream_id, facebook_comment_id, customer_name, customer_phone, customer_address, items } = body;
  if (!livestream_id || !customer_name || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const orderNumber = `LV-${Date.now()}`;
  let total = 0;
  for (const item of items) {
    total += (item.price || 0) * (item.quantity || 1);
  }

  const orderResult = await db.prepare(`
    INSERT INTO live_orders (livestream_id, order_number, customer_name, customer_phone, customer_address, facebook_comment_id, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(livestream_id, orderNumber, customer_name, customer_phone || null, customer_address || null, facebook_comment_id || null, total);

  const orderId = Number(orderResult.lastInsertRowid);

  for (const item of items) {
    await db.prepare(`
      INSERT INTO live_order_items (order_id, product_id, product_name, quantity, price, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.price * item.quantity);

    // Reserve inventory
    await db.prepare(`
      INSERT INTO inventory_reservations (product_id, order_id, quantity, status)
      VALUES (?, ?, ?, 'active')
    `).run(item.product_id, orderId, item.quantity);

    // Reduce available stock, increase reserved
    await db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?").run(item.quantity, item.product_id, item.quantity);
  }

  // Update comment status
  if (facebook_comment_id) {
    await db.prepare("UPDATE live_comments SET status = 'ordered' WHERE id = ?").run(facebook_comment_id);
  }

  await db.prepare("UPDATE livestreams SET order_count = order_count + 1, revenue = revenue + ? WHERE id = ?").run(total, livestream_id);

  const order = await db.prepare("SELECT * FROM live_orders WHERE id = ?").get(orderId) as any;
  const orderItems = await db.prepare("SELECT * FROM live_order_items WHERE order_id = ?").all(orderId) as any[];

  return NextResponse.json({ ...order, items: orderItems }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireApiAuth();
  if (error) return error;

  const body = await req.json();
  const { id, status, driver_id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];
  if (status) { fields.push("status = ?"); values.push(status); }
  if (driver_id !== undefined) { fields.push("driver_id = ?"); values.push(driver_id); }
  values.push(id);

  await db.prepare(`UPDATE live_orders SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  // Restore stock if cancelled
  if (status === "cancelled") {
    const items = await db.prepare("SELECT * FROM live_order_items WHERE order_id = ?").all(id) as any[];
    for (const item of items) {
      await db.prepare("UPDATE products SET quantity = quantity + ? WHERE id = ?").run(item.quantity, item.product_id);
      await db.prepare("UPDATE inventory_reservations SET status = 'released' WHERE order_id = ? AND product_id = ?").run(id, item.product_id);
    }
  }

  return NextResponse.json({ success: true });
}
