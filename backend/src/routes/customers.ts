import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const customers = await db.prepare("SELECT * FROM customers ORDER BY name ASC").all();
  res.json(customers);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const customer = await db.prepare("SELECT * FROM customers WHERE id = ?").get(intParam(req, "id"));
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json(customer);
});

router.post("/", requireAuth, requirePermission("customers.manage"), async (req: Request, res: Response) => {
  const { id, name, phone, email, address, customer_type, credit } = req.body;
  if (!name || !name.trim()) { res.status(400).json({ error: "Name is required" }); return; }

  if (id) {
    await db.prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, customer_type=?, credit=?, updated_at=datetime('now') WHERE id=?")
      .run(name.trim(), phone || null, email || null, address || null, customer_type || "retail", parseFloat(credit) || 0, id);
    res.json({ success: true });
  } else {
    await db.prepare("INSERT INTO customers (name, phone, email, address, customer_type, credit) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name.trim(), phone || null, email || null, address || null, customer_type || "retail", parseFloat(credit) || 0);
    res.json({ success: true });
  }
});

router.delete("/:id", requireAuth, requirePermission("customers.manage"), async (req: Request, res: Response) => {
  await db.prepare("DELETE FROM customers WHERE id = ?").run(intParam(req, "id"));
  res.json({ success: true });
});

export default router;
