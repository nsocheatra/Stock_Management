import { T } from "@/components/T";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import BarChartWidget from "@/components/BarChartWidget";
import PieChartWidget from "@/components/PieChartWidget";

interface ProductRow {
  name: string;
  quantity: number;
  min_stock: number;
  category: string | null;
}

interface MovementRow {
  type: string;
  quantity: number;
}

interface SaleRow {
  id: number;
  customer_id: number | null;
  total: number;
  item_count: number;
  customer_type: string | null;
  created_at: string;
  customer_name: string | null;
}

interface PromotionRow {
  id: number;
  name: string;
  type: string;
  value: number;
  active: number;
}

interface MemberRow {
  id: number;
  customer_id: number;
  tier_id: number | null;
  points: number;
  total_spent: number;
  tier_name: string | null;
}

interface TierRow {
  id: number;
  name: string;
  member_count: number;
}

interface DeliveryRow {
  id: number;
  status: string;
  fee: number;
  created_at: string;
  partner_name: string | null;
}

interface ExpenseRow {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default async function ReportsPage() {
  await requirePermission("reports.view");
  const products = await db.prepare("SELECT name, quantity, min_stock, category FROM products ORDER BY quantity ASC").all() as ProductRow[];
  const movements = await db.prepare("SELECT type, quantity FROM stock_movements").all() as MovementRow[];
  const supplierCount = (await db.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number }).count;

  const sales = await db.prepare(`
    SELECT s.*, c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.created_at DESC
    LIMIT 100
  `).all() as SaleRow[];

  // ── Promotions ──
  const promotions = await db.prepare("SELECT id, name, type, value, active FROM promotions ORDER BY created_at DESC").all() as PromotionRow[];
  const activePromos = promotions.filter(p => p.active);

  const promoTypeMap = new Map<string, number>();
  for (const p of promotions) {
    const label = p.type === "percentage" ? "Percentage" : p.type === "fixed" ? "Fixed" : "Buy X Get Y";
    promoTypeMap.set(label, (promoTypeMap.get(label) || 0) + 1);
  }
  const promoTypeData = Array.from(promoTypeMap.entries()).map(([name, value]) => ({ name, value }));

  // ── Members ──
  const members = await db.prepare(`
    SELECT m.*, mt.name as tier_name
    FROM members m
    LEFT JOIN membership_tiers mt ON mt.id = m.tier_id
    ORDER BY m.total_spent DESC
  `).all() as MemberRow[];

  const tiers = await db.prepare(`
    SELECT t.id, t.name, COUNT(m.id) as member_count
    FROM membership_tiers t
    LEFT JOIN members m ON m.tier_id = t.id
    GROUP BY t.id, t.name
    ORDER BY t.min_spend ASC
  `).all() as TierRow[];

  const tierData = tiers.map(t => ({ name: t.name, value: t.member_count }));
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalSpent = members.reduce((s, m) => s + m.total_spent, 0);

  // ── Deliveries ──
  const deliveries = await db.prepare(`
    SELECT d.id, d.status, d.fee, d.created_at, dp.name as partner_name
    FROM deliveries d
    LEFT JOIN delivery_partners dp ON dp.id = d.partner_id
    ORDER BY d.created_at DESC
    LIMIT 100
  `).all() as DeliveryRow[];

  const statusMap = new Map<string, number>();
  for (const d of deliveries) {
    statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1);
  }
  const deliveryStatusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
  const totalFees = deliveries.reduce((s, d) => s + d.fee, 0);

  // ── Expenses ──
  const expenses = await db.prepare(`
    SELECT id, category, amount, description, created_at
    FROM cash_flow
    WHERE type = 'expense'
    ORDER BY created_at DESC
    LIMIT 100
  `).all() as ExpenseRow[];

  const expenseCatMap = new Map<string, number>();
  for (const e of expenses) {
    expenseCatMap.set(e.category, (expenseCatMap.get(e.category) || 0) + e.amount);
  }
  const expenseCatData = Array.from(expenseCatMap.entries()).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Existing computed KPIs ──
  const totalIn = movements.filter((m) => m.type === "IN").reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = movements.filter((m) => m.type === "OUT").reduce((sum, m) => sum + m.quantity, 0);

  const categoryMap = new Map<string, number>();
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + p.quantity);
  });
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

  const lowStockCount = products.filter((p) => p.quantity <= p.min_stock).length;

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const wholesaleSales = sales.filter((s) => s.customer_type === "wholesale").reduce((sum, s) => sum + s.total, 0);
  const retailSales = sales.filter((s) => s.customer_type === "retail" || !s.customer_type).reduce((sum, s) => sum + s.total, 0);
  const wholesaleCount = sales.filter((s) => s.customer_type === "wholesale").length;
  const retailCount = sales.filter((s) => s.customer_type === "retail" || !s.customer_type).length;

  const salesPieData = [
    { name: "Wholesale", value: Math.round(wholesaleSales * 100) / 100 },
    { name: "Retail", value: Math.round(retailSales * 100) / 100 },
  ];

  // ── Financial KPIs (COGS, Profit) ──
  const cogsRow = await db.prepare(`
    SELECT COALESCE(SUM(p.cost_price * si.quantity), 0) as cogs
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE p.cost_price IS NOT NULL
  `).get() as { cogs: number } | undefined;
  const totalCOGS = cogsRow?.cogs || 0;
  const grossProfit = totalSales - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          <T k="reports.title" />
        </h1>
        <p className="text-sm text-faint mt-1"><T k="reports.subtitle" /></p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative bg-surface-blur border-surface rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] shadow-lg">
          <p className="text-xs font-semibold text-faint uppercase tracking-wider"><T k="reports.kpi.stockIn" /></p>
          <p className="text-4xl font-extrabold text-emerald-400 mt-2 tracking-tight">+{totalIn}</p>
          <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
        </div>
        <div className="group relative bg-surface-blur border-surface rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] shadow-lg">
          <p className="text-xs font-semibold text-faint uppercase tracking-wider"><T k="reports.kpi.stockOut" /></p>
          <p className="text-4xl font-extrabold text-rose-400 mt-2 tracking-tight">-{totalOut}</p>
          <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-rose-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
        </div>
        <div className="group relative bg-surface-blur border-surface rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] shadow-lg">
          <p className="text-xs font-semibold text-faint uppercase tracking-wider"><T k="reports.kpi.activeSuppliers" /></p>
          <p className="text-4xl font-extrabold text-default mt-2 tracking-tight">{supplierCount}</p>
          <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
        </div>
      </div>

      {/* Profit & Loss Summary */}
      {sales.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
            <T k="reports.financial.title" />
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.financial.revenue" /></p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${totalSales.toFixed(2)}</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.financial.cogs" /></p>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">${totalCOGS.toFixed(2)}</p>
              <p className="text-[10px] text-faint mt-0.5"><T k="reports.financial.cogsHint" /></p>
            </div>
            <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.financial.grossProfit" /></p>
              <p className={`text-2xl font-extrabold mt-1 ${grossProfit >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                ${grossProfit.toFixed(2)}
              </p>
              <p className="text-[10px] text-faint mt-0.5">
                <T k="reports.financial.grossMargin" />: {grossMargin.toFixed(1)}%
              </p>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.financial.opex" /></p>
              <p className="text-2xl font-extrabold text-rose-400 mt-1">${totalExpenses.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.financial.netProfit" /></p>
              <p className={`text-3xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${netProfit.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.financial.netMargin" /></p>
              <p className={`text-2xl font-extrabold mt-1 ${netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sales by Customer Type */}
      {sales.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
            <T k="reports.sales.title" />
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.sales.wholesale" /></p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">${wholesaleSales.toFixed(2)}</p>
                  <p className="text-xs text-faint mt-1"><T k="reports.sales.wholesaleTransactions" vars={{ count: wholesaleCount }} /></p>
                </div>
                <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
                  <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.sales.retail" /></p>
                  <p className="text-2xl font-extrabold text-sky-400 mt-1">${retailSales.toFixed(2)}</p>
                  <p className="text-xs text-faint mt-1"><T k="reports.sales.retailTransactions" vars={{ count: retailCount }} /></p>
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.sales.totalRevenue" /></p>
                <p className="text-3xl font-extrabold text-default mt-1">${totalSales.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2">
              <PieChartWidget data={salesPieData} height={240} />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6"><T k="reports.allocation.byProduct" /></h2>
          {products.length > 0 ? (
            <div className="pt-2">
              <BarChartWidget data={products} height={320} />
            </div>
          ) : (
            <p className="text-faint text-center py-12"><T k="reports.allocation.noData" /></p>
          )}
        </div>

        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6"><T k="reports.allocation.byCategory" /></h2>
          {categoryData.length > 0 ? (
            <div className="pt-2">
              <PieChartWidget data={categoryData} height={320} />
            </div>
          ) : (
            <p className="text-faint text-center py-12"><T k="reports.allocation.noData" /></p>
          )}
        </div>
      </div>

      {/* ── PROMOTIONS ── */}
      {promotions.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6"><T k="reports.promotions.title" /></h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.promotions.total" /></p>
                <p className="text-2xl font-extrabold text-violet-400 mt-1">{promotions.length}</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.promotions.active" /></p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{activePromos.length}</p>
              </div>
            </div>
            <div className="pt-2">
              <PieChartWidget data={promoTypeData} height={220} />
              <p className="text-xs text-center text-faint mt-2"><T k="reports.promotions.byType" /></p>
            </div>
          </div>
        </div>
      )}

      {/* ── MEMBERSHIP ── */}
      {members.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6"><T k="reports.membership.title" /></h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.membership.totalMembers" /></p>
                <p className="text-2xl font-extrabold text-sky-400 mt-1">{members.length}</p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.membership.totalPoints" /></p>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">{Math.round(totalPoints)}</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.membership.totalSpent" /></p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">${totalSpent.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2">
              {tierData.length > 0 ? (
                <PieChartWidget data={tierData} height={220} />
              ) : (
                <p className="text-faint text-center py-8"><T k="reports.allocation.noData" /></p>
              )}
              <p className="text-xs text-center text-faint mt-2"><T k="reports.membership.byTier" /></p>
            </div>
          </div>
        </div>
      )}

      {/* ── DELIVERIES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {deliveries.length > 0 && (
          <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />
            <h2 className="text-lg font-semibold text-default mb-6"><T k="reports.deliveries.title" /></h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.deliveries.total" /></p>
                <p className="text-2xl font-extrabold text-cyan-400 mt-1">{deliveries.length}</p>
              </div>
              <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.deliveries.totalFees" /></p>
                <p className="text-2xl font-extrabold text-teal-400 mt-1">${totalFees.toFixed(2)}</p>
              </div>
            </div>
            <PieChartWidget data={deliveryStatusData} height={220} />
            <p className="text-xs text-center text-faint mt-2"><T k="reports.deliveries.byStatus" /></p>
          </div>
        )}

        {/* ── EXPENSES ── */}
        {expenses.length > 0 && (
          <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />
            <h2 className="text-lg font-semibold text-default mb-6"><T k="reports.expenses.title" /></h2>
            <div className="mb-6">
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="reports.expenses.total" /></p>
                <p className="text-2xl font-extrabold text-rose-400 mt-1">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
            {expenseCatData.length > 0 ? (
              <PieChartWidget data={expenseCatData} height={220} />
            ) : (
              <p className="text-faint text-center py-8"><T k="reports.allocation.noData" /></p>
            )}
            <p className="text-xs text-center text-faint mt-2"><T k="reports.expenses.byCategory" /></p>
          </div>
        )}
      </div>

      {/* Recent Deliveries Table */}
      {deliveries.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl relative overflow-hidden">
          <div className="p-6 border-b border-surface">
            <h2 className="text-lg font-semibold text-default"><T k="reports.deliveries.title" /></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface bg-header">
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.deliveries.table.partner" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.deliveries.table.status" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.deliveries.table.fee" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.deliveries.table.date" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface text-sm">
                {deliveries.slice(0, 15).map((d) => (
                  <tr key={d.id} className="hover-surface transition-colors">
                    <td className="p-4 font-semibold text-default">{d.partner_name || "—"}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${
                        d.status === "delivered" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                        d.status === "in_transit" ? "text-sky-400 bg-sky-500/10 border-sky-500/20" :
                        d.status === "picked_up" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                        d.status === "failed" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                        "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                      }`}>
                        <T k={`delivery.statuses.${d.status}`} />
                      </span>
                    </td>
                    <td className="p-4 text-right text-muted">${d.fee.toFixed(2)}</td>
                    <td className="p-4 text-right text-xs text-faint font-mono">
                      {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Expenses Table */}
      {expenses.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl relative overflow-hidden">
          <div className="p-6 border-b border-surface">
            <h2 className="text-lg font-semibold text-default"><T k="reports.expenses.title" /></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface bg-header">
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.expenses.table.category" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.expenses.table.amount" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.expenses.table.description" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.expenses.table.date" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface text-sm">
                {expenses.slice(0, 15).map((e) => (
                  <tr key={e.id} className="hover-surface transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">
                        {e.category}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-rose-400">${e.amount.toFixed(2)}</td>
                    <td className="p-4 text-muted max-w-[200px] truncate">{e.description || "—"}</td>
                    <td className="p-4 text-right text-xs text-faint font-mono">
                      {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low stock alerts panel */}
      <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />
        <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${lowStockCount > 0 ? "bg-rose-500 animate-pulse shadow-md shadow-rose-500" : "bg-emerald-500"}`} />
          <T k="reports.shortages.title" />
        </h2>
        
        {lowStockCount > 0 ? (
          <div className="overflow-hidden rounded-xl border border-surface bg-header">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface bg-header">
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.shortages.product" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.shortages.currentStock" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.shortages.minStock" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface text-sm">
                {products
                  .filter((p) => p.quantity <= p.min_stock)
                  .map((p, i) => (
                    <tr key={i} className="hover-surface transition-colors">
                      <td className="p-4 font-semibold text-default">{p.name}</td>
                      <td className="p-4 text-right">
                        <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full font-bold text-xs">
                          <T k="reports.shortages.units" vars={{ qty: p.quantity }} />
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-muted"><T k="reports.shortages.safetyLimit" vars={{ min: p.min_stock }} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center bg-surface border border-dashed border-surface rounded-xl">
            <p className="font-medium text-default"><T k="reports.shortages.allSecure" /></p>
            <p className="text-xs text-faint mt-1"><T k="reports.shortages.noShortages" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
