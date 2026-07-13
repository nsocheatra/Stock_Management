import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const orders = await db.prepare(`
    SELECT co.*, c.name as customer_name
    FROM customer_orders co
    LEFT JOIN customers c ON c.id = co.customer_id
    ORDER BY co.created_at DESC
  `).all();
  res.json(orders);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const order = await db.prepare(`
    SELECT co.*, c.name as customer_name
    FROM customer_orders co
    LEFT JOIN customers c ON c.id = co.customer_id
    WHERE co.id = ?
  `).get(intParam(req, "id")) as any;
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.prepare("SELECT * FROM customer_order_items WHERE order_id = ?").all(intParam(req, "id"));
  res.json({ ...order, items });
});

router.post("/", requireAuth, requirePermission("orders.manage"), async (req: Request, res: Response) => {
  const { customer_id, delivery_address, delivery_fee, note, items } = req.body;
  if (!items || items.length === 0) { res.status(400).json({ error: "No items" }); return; }
  const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0) + (delivery_fee || 0);

  const result = await db.transaction(async () => {
    const r = await db.prepare("INSERT INTO customer_orders (customer_id, total, delivery_address, delivery_fee, note) VALUES (?, ?, ?, ?, ?)")
      .run(customer_id || null, total, delivery_address || null, delivery_fee || 0, note || null);
    const orderId = r.lastInsertRowid as number;
    const insert = db.prepare("INSERT INTO customer_order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");
    for (const item of items) {
      await insert.run(orderId, item.product_id, item.product_name, item.price, item.quantity);
    }
    return orderId;
  })();

  res.json({ success: true, id: result });
});

router.put("/:id/status", requireAuth, requirePermission("orders.manage"), async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: "Status required" }); return; }
  await db.prepare("UPDATE customer_orders SET status = ? WHERE id = ?").run(status, intParam(req, "id"));
  res.json({ success: true });
});

router.post("/:id/convert-to-sale", requireAuth, requirePermission("orders.manage"), async (req: Request, res: Response) => {
  const orderId = intParam(req, "id");
  const order = await db.prepare("SELECT * FROM customer_orders WHERE id = ?").get(orderId) as any;
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.sale_id) { res.status(400).json({ error: "Already converted to sale" }); return; }

  const items = await db.prepare("SELECT * FROM customer_order_items WHERE order_id = ?").all(orderId) as any[];
  if (items.length === 0) { res.status(400).json({ error: "No items in order" }); return; }

  try {
    await db.transaction(async () => {
      for (const item of items) {
        const product = await db.prepare("SELECT id, quantity, price FROM products WHERE id = ?").get(item.product_id) as any;
        if (product && product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product_name}`);
        }
        if (product) {
          await db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, 'OUT', ?, ?)")
            .run(item.product_id, item.quantity, `Customer order #${orderId}: ${item.product_name}`);
          await db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.product_id);
        }
      }
      const saleResult = await db.prepare("INSERT INTO sales (customer_id, total, item_count) VALUES (?, ?, ?)")
        .run(order.customer_id, order.total, items.length);
      const saleId = saleResult.lastInsertRowid as number;
      const insert = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity) VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of items) {
        const product = await db.prepare("SELECT id, sku FROM products WHERE id = ?").get(item.product_id) as any;
        await insert.run(saleId, item.product_id, item.product_name, product?.sku || null, item.price, item.quantity);
      }
      await db.prepare("UPDATE customer_orders SET sale_id = ?, status = 'delivered' WHERE id = ?").run(saleId, orderId);
    })();
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to process order" });
  }
});

export default router;
