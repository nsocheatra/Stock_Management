import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/summary", requireAuth, async (_req: Request, res: Response) => {
  const totalProducts = await db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
  const totalStock = await db.prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM products").get() as { total: number };
  const lowStock = await db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity <= min_stock").get() as { count: number };
  const todaySales = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE date(created_at) = date('now')").get() as { count: number; total: number };
  const totalSales = await db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales").get() as { total: number };
  const totalCustomers = await db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number };
  const totalSuppliers = await db.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number };
  const pendingDebts = await db.prepare("SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM debts WHERE status IN ('pending', 'partial')").get() as { total: number };

  res.json({
    totalProducts: totalProducts.count,
    totalStock: totalStock.total,
    lowStock: lowStock.count,
    todaySales: todaySales.count,
    todayRevenue: todaySales.total,
    totalRevenue: totalSales.total,
    totalCustomers: totalCustomers.count,
    totalSuppliers: totalSuppliers.count,
    pendingDebts: pendingDebts.total,
  });
});

export default router;

