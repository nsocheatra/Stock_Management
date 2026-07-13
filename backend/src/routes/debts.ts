import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const debts = await db.prepare("SELECT * FROM debts ORDER BY created_at DESC").all();
  res.json(debts);
});

router.post("/", requireAuth, requirePermission("debts.manage"), async (req: Request, res: Response) => {
  const { type, reference_id, amount, due_date, note } = req.body;
  if (!type || !reference_id || !amount) { res.status(400).json({ error: "Missing required fields" }); return; }
  await db.prepare("INSERT INTO debts (type, reference_id, amount, due_date, note) VALUES (?, ?, ?, ?, ?)")
    .run(type, reference_id, amount, due_date || null, note || null);
  res.json({ success: true });
});

router.post("/payment", requireAuth, requirePermission("debts.manage"), async (req: Request, res: Response) => {
  const { debt_id, amount, payment_method, note } = req.body;
  if (!debt_id || !amount) { res.status(400).json({ error: "Missing fields" }); return; }
  await db.transaction(async () => {
    await db.prepare("INSERT INTO debt_payments (debt_id, amount, payment_method, note) VALUES (?, ?, ?, ?)")
      .run(debt_id, amount, payment_method || "cash", note || null);
    const debt = await db.prepare("SELECT amount, paid_amount FROM debts WHERE id = ?").get(debt_id) as any;
    const newPaid = debt.paid_amount + amount;
    const status = newPaid >= debt.amount ? "paid" : "partial";
    await db.prepare("UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?").run(newPaid, status, debt_id);
  })();
  res.json({ success: true });
});

export default router;

