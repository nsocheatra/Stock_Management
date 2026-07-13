import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { getCurrentUser } from "../auth.js";

const router = Router();

const dataCategories: Record<string, string[]> = {
  products: ["products", "product_variants", "customer_group_prices", "customer_groups"],
  stock: ["stock_movements", "batches", "locations"],
  sales: ["sale_items", "sales", "receipts", "customer_order_items", "customer_orders"],
  customers_suppliers: ["customers", "suppliers"],
  deliveries: ["deliveries", "delivery_partners"],
  debts: ["debt_payments", "debts"],
  cashflow: ["cash_flow"],
  promotions: ["promotions"],
  members: ["membership_tiers", "members"],
  audits: ["physical_audit_items", "physical_audits"],
  notifications: ["notifications"],
};

router.post("/clear-data", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const user = await getCurrentUser(token);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Unauthorized" }); return; }

  const { categories } = req.body;
  const tables = categories
    ? categories.flatMap((c: string) => dataCategories[c] || [])
    : Object.values(dataCategories).flat();

  for (const table of tables) {
    try {
      await db.prepare(`DELETE FROM ${table}`).run();
    } catch { /* table may not exist */ }
  }

  res.json({ success: true });
});

export default router;

