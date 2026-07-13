import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const productId = req.query.product_id ? parseInt(req.query.product_id as string) : null;
  if (productId) {
    const variants = await db.prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY name ASC").all(productId);
    res.json(variants);
  } else {
    const variants = await db.prepare("SELECT * FROM product_variants ORDER BY name ASC").all();
    res.json(variants);
  }
});

router.post("/", requireAuth, requirePermission("products.manage"), async (req: Request, res: Response) => {
  const { product_id, name, sku, barcode, price } = req.body;
  if (!product_id || !name) { res.status(400).json({ error: "Missing fields" }); return; }
  await db.prepare("INSERT INTO product_variants (product_id, name, sku, barcode, price) VALUES (?, ?, ?, ?, ?)")
    .run(product_id, name, sku || null, barcode || null, price ? parseFloat(price) : null);
  await db.prepare("UPDATE products SET has_variants = 1, updated_at = datetime('now') WHERE id = ?").run(product_id);
  res.json({ success: true });
});

router.put("/:id", requireAuth, requirePermission("products.manage"), async (req: Request, res: Response) => {
  const { name, sku, barcode, price } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  await db.prepare("UPDATE product_variants SET name=?, sku=?, barcode=?, price=?, updated_at=datetime('now') WHERE id=?")
    .run(name, sku || null, barcode || null, price ? parseFloat(price) : null, intParam(req, "id"));
  res.json({ success: true });
});

router.delete("/:id", requireAuth, requirePermission("products.manage"), async (req: Request, res: Response) => {
  const id = intParam(req, "id");
  const v = await db.prepare("SELECT product_id FROM product_variants WHERE id = ?").get(id) as { product_id: number } | undefined;
  await db.prepare("DELETE FROM product_variants WHERE id = ?").run(id);
  if (v) {
    const remaining = await db.prepare("SELECT COUNT(*) as c FROM product_variants WHERE product_id = ?").get(v.product_id) as { c: number };
    if (remaining.c === 0) {
      await db.prepare("UPDATE products SET has_variants = 0, updated_at = datetime('now') WHERE id = ?").run(v.product_id);
    }
  }
  res.json({ success: true });
});

export default router;
