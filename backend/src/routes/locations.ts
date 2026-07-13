import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const locations = await db.prepare("SELECT * FROM locations ORDER BY name ASC").all();
  res.json(locations);
});

router.post("/", requireAuth, requirePermission("stock.manage"), async (req: Request, res: Response) => {
  const { name, address, is_default } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  if (is_default) {
    await db.prepare("UPDATE locations SET is_default = 0").run();
  }
  await db.prepare("INSERT INTO locations (name, address, is_default) VALUES (?, ?, ?)")
    .run(name, address || null, is_default ? 1 : 0);
  res.json({ success: true });
});

router.put("/:id", requireAuth, requirePermission("stock.manage"), async (req: Request, res: Response) => {
  const { name, address, is_default } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  if (is_default) {
    await db.prepare("UPDATE locations SET is_default = 0").run();
  }
  await db.prepare("UPDATE locations SET name=?, address=?, is_default=?, updated_at=datetime('now') WHERE id=?")
    .run(name, address || null, is_default ? 1 : 0, intParam(req, "id"));
  res.json({ success: true });
});

router.delete("/:id", requireAuth, requirePermission("stock.manage"), async (req: Request, res: Response) => {
  await db.prepare("DELETE FROM locations WHERE id = ?").run(intParam(req, "id"));
  res.json({ success: true });
});

export default router;
