import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/tiers", requireAuth, async (_req: Request, res: Response) => {
  const tiers = await db.prepare("SELECT * FROM membership_tiers ORDER BY min_spend ASC").all();
  res.json(tiers);
});

router.post("/tiers", requireAuth, requirePermission("membership.manage"), async (req: Request, res: Response) => {
  const { name, min_spend, discount_percent, benefits } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  await db.prepare("INSERT INTO membership_tiers (name, min_spend, discount_percent, benefits) VALUES (?, ?, ?, ?)")
    .run(name, parseFloat(min_spend) || 0, parseFloat(discount_percent) || 0, benefits || null);
  res.json({ success: true });
});

router.get("/members", requireAuth, async (_req: Request, res: Response) => {
  const members = await db.prepare(`
    SELECT m.*, c.name as customer_name, mt.name as tier_name
    FROM members m
    JOIN customers c ON c.id = m.customer_id
    LEFT JOIN membership_tiers mt ON mt.id = m.tier_id
    ORDER BY c.name ASC
  `).all();
  res.json(members);
});

router.post("/enroll", requireAuth, requirePermission("membership.manage"), async (req: Request, res: Response) => {
  const { customer_id, tier_id } = req.body;
  if (!customer_id) { res.status(400).json({ error: "Customer required" }); return; }
  await db.prepare("INSERT OR IGNORE INTO members (customer_id, tier_id) VALUES (?, ?)").run(customer_id, tier_id || null);
  res.json({ success: true });
});

export default router;

