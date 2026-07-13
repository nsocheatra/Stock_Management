import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const products = await db.prepare("SELECT * FROM products ORDER BY name ASC").all();
  res.json(products);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const product = await db.prepare("SELECT * FROM products WHERE id = ?").get(intParam(req, "id"));
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(product);
});

router.post("/", requireAuth, requirePermission("products.manage"), async (req: Request, res: Response) => {
  const body = req.body;
  const track_batches = body.track_batches ? 1 : 0;
  const result = await db.prepare(`
    INSERT INTO products (name, sku, price, cost_price, selling_price, original_price, unit_price, price_per_case, quantity, description, category, min_stock, supplier_id, barcode, image_url, track_batches)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.sku, parseFloat(body.price) || 0,
    body.cost_price ? parseFloat(body.cost_price) : null,
    body.selling_price ? parseFloat(body.selling_price) : null,
    body.original_price ? parseFloat(body.original_price) : null,
    body.unit_price ? parseFloat(body.unit_price) : null,
    body.price_per_case ? parseFloat(body.price_per_case) : null,
    parseInt(body.quantity) || 0, body.description || null,
    body.category || null, parseInt(body.minStock) || 5,
    body.supplierId ? parseInt(body.supplierId) : null,
    body.barcode || null, body.image_url || null, track_batches,
  );
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put("/:id", requireAuth, requirePermission("products.manage"), async (req: Request, res: Response) => {
  const body = req.body;
  const track_batches = body.track_batches ? 1 : 0;
  await db.prepare(`
    UPDATE products SET name=?, sku=?, price=?, cost_price=?, selling_price=?, original_price=?, unit_price=?, price_per_case=?, quantity=?, description=?, category=?, min_stock=?, supplier_id=?, barcode=?, image_url=?, track_batches=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    body.name, body.sku, parseFloat(body.price) || 0,
    body.cost_price ? parseFloat(body.cost_price) : null,
    body.selling_price ? parseFloat(body.selling_price) : null,
    body.original_price ? parseFloat(body.original_price) : null,
    body.unit_price ? parseFloat(body.unit_price) : null,
    body.price_per_case ? parseFloat(body.price_per_case) : null,
    parseInt(body.quantity) || 0, body.description || null,
    body.category || null, parseInt(body.minStock) || 5,
    body.supplierId ? parseInt(body.supplierId) : null,
    body.barcode || null, body.image_url || null, track_batches,
    intParam(req, "id"),
  );
  res.json({ success: true });
});

router.delete("/:id", requireAuth, requirePermission("products.manage"), async (req: Request, res: Response) => {
  const id = intParam(req, "id");
  await db.prepare("DELETE FROM stock_movements WHERE product_id = ?").run(id);
  await db.prepare("DELETE FROM products WHERE id = ?").run(id);
  res.json({ success: true });
});

export default router;


