import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const suppliers = await db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
  res.json(suppliers);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const supplier = await db.prepare("SELECT * FROM suppliers WHERE id = ?").get(intParam(req, "id"));
  if (!supplier) { res.status(404).json({ error: "Not found" }); return; }
  res.json(supplier);
});

router.post("/", requireAuth, requirePermission("suppliers.manage"), async (req: Request, res: Response) => {
  const { name, email, phone, address } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  await db.prepare("INSERT INTO suppliers (name, email, phone, address) VALUES (?, ?, ?, ?)").run(name, email || null, phone || null, address || null);
  res.json({ success: true });
});

router.put("/:id", requireAuth, requirePermission("suppliers.manage"), async (req: Request, res: Response) => {
  const { name, email, phone, address } = req.body;
  await db.prepare("UPDATE suppliers SET name=?, email=?, phone=?, address=?, updated_at=datetime('now') WHERE id=?").run(name, email || null, phone || null, address || null, intParam(req, "id"));
  res.json({ success: true });
});

router.delete("/:id", requireAuth, requirePermission("suppliers.manage"), async (req: Request, res: Response) => {
  const id = intParam(req, "id");
  await db.prepare("UPDATE products SET supplier_id = NULL WHERE supplier_id = ?").run(id);
  await db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  res.json({ success: true });
});

export default router;
