import { T } from "@/components/T";
import { db } from "@/lib/db";
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

export default function ReportsPage() {
  const products = db.prepare("SELECT name, quantity, min_stock, category FROM products ORDER BY quantity ASC").all() as ProductRow[];
  const movements = db.prepare("SELECT type, quantity FROM stock_movements").all() as MovementRow[];
  const supplierCount = (db.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number }).count;

  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.created_at DESC
    LIMIT 100
  `).all() as SaleRow[];

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

      {/* Recent Sales Table */}
      {sales.length > 0 && (
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl relative overflow-hidden">
          <div className="p-6 border-b border-surface">
            <h2 className="text-lg font-semibold text-default"><T k="reports.recentTransactions" /></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface bg-header">
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.table.customer" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="reports.table.type" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.table.items" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.table.total" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="reports.table.date" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {sales.slice(0, 20).map((s) => (
                  <tr key={s.id} className="hover-surface transition-colors duration-150">
                    <td className="p-4 font-semibold text-default">{s.customer_name || <T k="reports.walkIn" />}</td>
                    <td className="p-4">
                      {s.customer_type === "wholesale" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                          <T k="reports.sales.wholesale" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-1 rounded-full border border-sky-500/20">
                          <T k="reports.sales.retail" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-muted">{s.item_count}</td>
                    <td className="p-4 text-right font-bold text-default">${s.total.toFixed(2)}</td>
                    <td className="p-4 text-right text-xs text-faint font-mono">
                      {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
