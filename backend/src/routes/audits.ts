import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const audits = await db.prepare("SELECT * FROM physical_audits ORDER BY created_at DESC").all();
  res.json(audits);
});

router.post("/clear-all", requireAuth, requirePermission("audit.manage"), async (_req: Request, res: Response) => {
  const audits = await db.prepare("SELECT id FROM physical_audits").all() as any[];
  for (const a of audits) {
    await db.prepare("DELETE FROM physical_audit_items WHERE audit_id = ?").run(a.id);
    await db.prepare("DELETE FROM physical_audits WHERE id = ?").run(a.id);
  }
  res.json({ success: true });
});

router.post("/", requireAuth, requirePermission("audit.manage"), async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }

  const result = await db.prepare("INSERT INTO physical_audits (name) VALUES (?)").run(name);
  const auditId = result.lastInsertRowid as number;

  const products = await db.prepare("SELECT id, name, has_variants FROM products ORDER BY name ASC").all() as { id: number; name: string; has_variants: number }[];
  const insertItem = db.prepare("INSERT INTO physical_audit_items (audit_id, product_id, variant_id, expected_qty) VALUES (?, ?, ?, ?)");
  const getVariants = db.prepare("SELECT id FROM product_variants WHERE product_id = ?");
  const getVariantQty = db.prepare("SELECT quantity FROM product_variants WHERE id = ?");

  for (const product of products) {
    if (product.has_variants) {
      const variants = await getVariants.all(product.id) as { id: number }[];
      if (variants.length > 0) {
        for (const v of variants) {
          const vRow = await getVariantQty.get(v.id) as { quantity: number } | undefined;
          await insertItem.run(auditId, product.id, v.id, vRow?.quantity || 0);
        }
        continue;
      }
    }
    const qty = await db.prepare("SELECT quantity FROM products WHERE id = ?").get(product.id) as { quantity: number } | undefined;
    await insertItem.run(auditId, product.id, null, qty?.quantity || 0);
  }

  res.json({ success: true, id: auditId });
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const audit = await db.prepare("SELECT * FROM physical_audits WHERE id = ?").get(intParam(req, "id")) as any;
  if (!audit) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.prepare(`
    SELECT ai.*, p.name as product_name, p.sku
    FROM physical_audit_items ai
    JOIN products p ON p.id = ai.product_id
    WHERE ai.audit_id = ?
    ORDER BY p.name ASC
  `).all(intParam(req, "id"));
  res.json({ ...audit, items });
});

router.put("/items/:itemId", requireAuth, requirePermission("audit.manage"), async (req: Request, res: Response) => {
  const itemId = intParam(req, "itemId");
  const { actual_qty, note } = req.body;
  if (isNaN(actual_qty) || actual_qty < 0) { res.status(400).json({ error: "Invalid values" }); return; }

  const item = await db.prepare("SELECT expected_qty FROM physical_audit_items WHERE id = ?").get(itemId) as { expected_qty: number } | undefined;
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }

  const difference = actual_qty - item.expected_qty;
  await db.prepare("UPDATE physical_audit_items SET actual_qty = ?, difference = ?, note = ? WHERE id = ?")
    .run(actual_qty, difference, note || null, itemId);
  res.json({ success: true });
});

router.put("/:id/complete", requireAuth, requirePermission("audit.manage"), async (req: Request, res: Response) => {
  const auditId = intParam(req, "id");
  const uncounted = await db.prepare("SELECT COUNT(*) as c FROM physical_audit_items WHERE audit_id = ? AND actual_qty IS NULL").get(auditId) as { c: number };
  if (uncounted.c > 0) { res.status(400).json({ error: "All items must be counted before completing" }); return; }
  await db.prepare("UPDATE physical_audits SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(auditId);
  res.json({ success: true });
});

router.put("/:id/cancel", requireAuth, requirePermission("audit.manage"), async (req: Request, res: Response) => {
  const auditId = intParam(req, "id");
  await db.prepare("UPDATE physical_audits SET status = 'cancelled' WHERE id = ?").run(auditId);
  res.json({ success: true });
});

router.put("/:id/apply", requireAuth, requirePermission("audit.manage"), async (req: Request, res: Response) => {
  const auditId = intParam(req, "id");
  const items = await db.prepare(`
    SELECT ai.*, p.name as product_name
    FROM physical_audit_items ai
    JOIN products p ON p.id = ai.product_id
    WHERE ai.audit_id = ? AND ai.actual_qty IS NOT NULL AND ai.difference != 0
  `).all(auditId) as any[];

  const updateProduct = db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?");
  const updateVariant = db.prepare("UPDATE product_variants SET quantity = ?, updated_at = datetime('now') WHERE id = ?");
  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, ?, ?, ?)");
  const getProductQty = db.prepare("SELECT quantity FROM products WHERE id = ?");

  for (const item of items) {
    const diff = item.actual_qty - item.expected_qty;
    const type = diff > 0 ? "IN" : "OUT";
    if (item.variant_id) {
      const v = await db.prepare("SELECT quantity FROM product_variants WHERE id = ?").get(item.variant_id) as { quantity: number } | undefined;
      if (v) {
        const newVariantQty = Math.max(0, v.quantity + diff);
        await updateVariant.run(newVariantQty, item.variant_id);
      }
      const p = await getProductQty.get(item.product_id) as { quantity: number } | undefined;
      if (p) {
        const newProductQty = Math.max(0, p.quantity + diff);
        await updateProduct.run(newProductQty, item.product_id);
      }
    } else {
      await updateProduct.run(item.actual_qty, item.product_id);
    }
    await insertMovement.run(item.product_id, type, Math.abs(diff), `Stock count correction (audit #${auditId})`);
  }

  res.json({ success: true });
});

export default router;
