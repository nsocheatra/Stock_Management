import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { isSecretKey } from "../secrets.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const rows = await db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const s: Record<string, string> = {};
  for (const row of rows) {
    if (!isSecretKey(row.key)) s[row.key] = row.value;
  }
  res.json(s);
});

router.post("/", requireAuth, requirePermission("settings.manage"), async (req: Request, res: Response) => {
  const keys = [
    "printer_type", "paper_width", "receipt_header", "receipt_footer",
    "receipt_copies", "auto_print", "store_name", "store_address", "store_phone",
    "printer_ip", "printer_port",
    "telegram_notify_low_stock",
    "telegram_notify_daily",
    "payment_default_method", "payment_methods_enabled",
    "tax_rate", "tax_label",
  ];
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = req.body[key];
    if (val !== undefined) await upsert.run(key, String(val));
  }
  res.json({ success: true });
});

export default router;

