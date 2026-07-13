import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const sales = await db.prepare(`
    SELECT s.*, c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.created_at DESC LIMIT ?
  `).all(limit);
  res.json(sales);
});

router.get("/:id/items", requireAuth, async (req: Request, res: Response) => {
  const items = await db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(intParam(req, "id"));
  res.json(items);
});

router.post("/pos", requireAuth, requirePermission("pos.access"), async (req: Request, res: Response) => {
  const { items, customer_id, customer_type, payment_method, discount_total, discount_type } = req.body;
  if (!items || items.length === 0) { res.status(400).json({ error: "No items provided" }); return; }

  const getProduct = db.prepare("SELECT id, name, sku, quantity, price, has_variants, track_batches FROM products WHERE id = ?");
  const getVariant = db.prepare("SELECT id, product_id, quantity FROM product_variants WHERE id = ?");
  const getBatch = db.prepare("SELECT id, product_id, quantity FROM batches WHERE id = ?");
  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note, variant_id, batch_id, location_id) VALUES (?, 'OUT', ?, ?, ?, ?, ?)");
  const updateStock = db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?");

  try {
    const sale = await db.transaction(async () => {
      let subtotal = 0;
      let itemCount = 0;
      const saleItems: Array<any> = [];

      for (const item of items) {
        const product = await getProduct.get(item.product_id) as any;
        if (!product) throw new Error(`Product ${item.product_id} not found`);

        if (item.variant_id) {
          const variant = await getVariant.get(item.variant_id) as any;
          if (!variant) throw new Error(`Variant ${item.variant_id} not found`);
          if (variant.quantity < item.quantity) throw new Error(`Insufficient stock for variant`);
          await db.prepare("UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.variant_id);
        } else {
          if (product.quantity < item.quantity) throw new Error(`Insufficient stock for product`);
        }

        if (item.batch_id) {
          const batch = await getBatch.get(item.batch_id) as any;
          if (!batch) throw new Error(`Batch not found`);
          if (batch.quantity < item.quantity) throw new Error(`Insufficient stock for batch`);
          await db.prepare("UPDATE batches SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.batch_id);
        }

        await insertMovement.run(item.product_id, item.quantity, "POS sale", item.variant_id || null, item.batch_id || null, item.location_id || null);
        await updateStock.run(item.quantity, item.product_id);
        subtotal += item.price * item.quantity;
        itemCount += item.quantity;
        saleItems.push({
          product_id: item.product_id, product_name: product.name, sku: product.sku,
          price: item.price, quantity: item.quantity,
          discount: item.discount, discount_type: item.discount_type, promotion_id: item.promotion_id,
          variant_id: item.variant_id, batch_id: item.batch_id, location_id: item.location_id,
        });
      }

      const total = subtotal - (discount_total || 0);
      const saleResult = await db.prepare(
        "INSERT INTO sales (customer_id, total, item_count, customer_type, payment_method, discount, discount_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(customer_id || null, total, itemCount, customer_type || null, payment_method || "cash", discount_total || 0, discount_type || null);
      const saleId = saleResult.lastInsertRowid as number;

      const insertItem = db.prepare(
        "INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity, discount, discount_type, promotion_id, variant_id, batch_id, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const si of saleItems) {
        await insertItem.run(saleId, si.product_id, si.product_name, si.sku, si.price, si.quantity,
          si.discount || null, si.discount_type || null, si.promotion_id || null,
          si.variant_id || null, si.batch_id || null, si.location_id || null);
      }

      const receiptData = JSON.stringify({
        items: saleItems.map(si => ({ name: si.product_name, sku: si.sku, price: si.price, qty: si.quantity })),
        subtotal, discount: discount_total || 0, discountType: discount_type, total, paymentMethod: payment_method,
        customerId: customer_id, customerType: customer_type,
      });
      await db.prepare("INSERT INTO receipts (receipt_data, total, item_count) VALUES (?, ?, ?)")
        .run(receiptData, total, itemCount);

      return { saleId, total, itemCount, subtotal, discount: discount_total || 0 };
    })();

    res.json({ success: true, ...sale as any });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to process sale" });
  }
});

export default router;
