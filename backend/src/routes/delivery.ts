import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/partners", requireAuth, async (_req: Request, res: Response) => {
  const partners = await db.prepare("SELECT * FROM delivery_partners ORDER BY name ASC").all();
  res.json(partners);
});

router.post("/partners", requireAuth, requirePermission("delivery.manage"), async (req: Request, res: Response) => {
  const { name, phone, commission_type, commission_value } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  await db.prepare("INSERT INTO delivery_partners (name, phone, commission_type, commission_value) VALUES (?, ?, ?, ?)")
    .run(name, phone || null, commission_type || "fixed", parseFloat(commission_value) || 0);
  res.json({ success: true });
});

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const deliveries = await db.prepare("SELECT d.*, dp.name as partner_name FROM deliveries d LEFT JOIN delivery_partners dp ON dp.id = d.partner_id ORDER BY d.created_at DESC").all();
  res.json(deliveries);
});

router.post("/", requireAuth, requirePermission("delivery.manage"), async (req: Request, res: Response) => {
  const { order_id, partner_id, fee, note } = req.body;
  await db.prepare("INSERT INTO deliveries (order_id, partner_id, fee, note) VALUES (?, ?, ?, ?)")
    .run(order_id || null, partner_id || null, parseFloat(fee) || 0, note || null);
  res.json({ success: true });
});

export default router;

