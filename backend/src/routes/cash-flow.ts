import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const entries = await db.prepare("SELECT * FROM cash_flow ORDER BY created_at DESC").all();
  res.json(entries);
});

router.post("/", requireAuth, requirePermission("cashflow.manage"), async (req: Request, res: Response) => {
  const { type, category, amount, description } = req.body;
  if (!type || !category || !amount) { res.status(400).json({ error: "Missing fields" }); return; }
  await db.prepare("INSERT INTO cash_flow (type, category, amount, description) VALUES (?, ?, ?, ?)")
    .run(type, category, amount, description || null);
  res.json({ success: true });
});

export default router;

