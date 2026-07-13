import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/movements", requireAuth, async (req: Request, res: Response) => {
  const productId = req.query.product_id ? parseInt(req.query.product_id as string) : null;
  const limit = parseInt(req.query.limit as string) || 200;
  if (productId) {
    const movements = await db.prepare(`
      SELECT sm.*, p.name as product_name, l.name as location_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN locations l ON l.id = sm.location_id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC LIMIT ?
    `).all(productId, limit);
    res.json(movements);
  } else {
    const movements = await db.prepare(`
      SELECT sm.*, p.name as product_name, l.name as location_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN locations l ON l.id = sm.location_id
      ORDER BY sm.created_at DESC LIMIT ?
    `).all(limit);
    res.json(movements);
  }
});

router.post("/movements", requireAuth, requirePermission("stock.manage"), async (req: Request, res: Response) => {
  const { product_id, type, quantity, note, date, unit_cost, case_cost, case_quantity, location_id, batch_id, variant_id } = req.body;

  const product = await db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as { quantity: number } | undefined;
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const newQty = type === "IN" ? product.quantity + quantity : product.quantity - quantity;
  if (newQty < 0) { res.status(400).json({ error: "Insufficient stock" }); return; }

  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, unit_cost, case_cost, case_quantity, note, created_at, location_id, batch_id, variant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const updateProduct = db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?");

  await db.transaction(async () => {
    const ts = date ? `${date} ${new Date().toTimeString().slice(0, 8)}` : undefined;
    await insertMovement.run(product_id, type, quantity, unit_cost || null, case_cost || null, case_quantity || null, note || null, ts || null, location_id || null, batch_id || null, variant_id || null);
    await updateProduct.run(newQty, product_id);

    if (type === "IN" && batch_id) {
      await db.prepare("UPDATE batches SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?").run(quantity, batch_id);
    }
    if (type === "OUT" && batch_id) {
      await db.prepare("UPDATE batches SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?").run(quantity, batch_id);
    }
  })();

  res.json({ success: true });
});

export default router;

