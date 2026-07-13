import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const promotions = await db.prepare("SELECT * FROM promotions ORDER BY created_at DESC").all();
  res.json(promotions);
});

router.post("/", requireAuth, requirePermission("promotions.manage"), async (req: Request, res: Response) => {
  const { name, type, value, min_purchase, start_date, end_date, product_id, buy_qty, get_qty } = req.body;
  if (!name || !type) { res.status(400).json({ error: "Missing fields" }); return; }
  await db.prepare("INSERT INTO promotions (name, type, value, min_purchase, start_date, end_date, product_id, buy_qty, get_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(name, type, parseFloat(value) || 0, parseFloat(min_purchase) || 0, start_date || null, end_date || null, product_id || null, parseInt(buy_qty) || 0, parseInt(get_qty) || 0);
  res.json({ success: true });
});

export default router;

