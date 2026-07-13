import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const productId = req.query.product_id ? parseInt(req.query.product_id as string) : null;
  if (productId) {
    const batches = await db.prepare("SELECT b.*, p.name as product_name FROM batches b JOIN products p ON p.id = b.product_id WHERE b.product_id = ? ORDER BY b.created_at DESC").all(productId);
    res.json(batches);
  } else {
    const batches = await db.prepare("SELECT b.*, p.name as product_name FROM batches b JOIN products p ON p.id = b.product_id ORDER BY b.created_at DESC").all();
    res.json(batches);
  }
});

router.post("/", requireAuth, requirePermission("stock.manage"), async (req: Request, res: Response) => {
  const { product_id, variant_id, batch_no, location_id, quantity, expiry_date, cost_price } = req.body;
  if (!product_id || !batch_no) { res.status(400).json({ error: "Missing fields" }); return; }
  await db.prepare("INSERT INTO batches (product_id, variant_id, batch_no, location_id, quantity, expiry_date, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(product_id, variant_id || null, batch_no, location_id || null, parseInt(quantity) || 0, expiry_date || null, cost_price ? parseFloat(cost_price) : null);
  await db.prepare("UPDATE products SET track_batches = 1, updated_at = datetime('now') WHERE id = ?").run(product_id);
  res.json({ success: true });
});

router.delete("/:id", requireAuth, requirePermission("stock.manage"), async (req: Request, res: Response) => {
  await db.prepare("DELETE FROM batches WHERE id = ?").run(intParam(req, "id"));
  res.json({ success: true });
});

export default router;
