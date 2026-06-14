import { db } from "@/lib/db";
import { Package, Truck, AlertTriangle, TrendingUp } from "lucide-react";
import BarChartWidget from "@/components/BarChartWidget";

interface DashboardData {
  totalProducts: number;
  totalSuppliers: number;
  lowStock: number;
  movements: Array<{
    id: number;
    product_name: string;
    note: string | null;
    type: string;
    quantity: number;
  }>;
  products: Array<{ name: string; quantity: number }>;
}

function getDashboardData(): DashboardData {
  const totalProducts = (db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }).count;
  const totalSuppliers = (db.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number }).count;
  const lowStock = (db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity <= min_stock").get() as { count: number }).count;
  const movements = db.prepare(`
    SELECT m.id, p.name as product_name, m.note, m.type, m.quantity
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    ORDER BY m.created_at DESC
    LIMIT 5
  `).all() as DashboardData["movements"];
  const products = db.prepare("SELECT name, quantity FROM products ORDER BY quantity ASC LIMIT 10").all() as DashboardData["products"];

  return { totalProducts, totalSuppliers, lowStock, movements, products };
}

export default function DashboardPage() {
  const data = getDashboardData();

  const cards = [
    {
      label: "Total Products",
      value: data.totalProducts,
      icon: Package,
      gradient: "from-violet-500 to-indigo-500",
      glowColor: "group-hover:border-violet-500/50 shadow-violet-500/10",
      iconColor: "text-violet-400 bg-violet-500/10 border border-violet-500/20",
    },
    {
      label: "Suppliers",
      value: data.totalSuppliers,
      icon: Truck,
      gradient: "from-emerald-500 to-teal-500",
      glowColor: "group-hover:border-emerald-500/50 shadow-emerald-500/10",
      iconColor: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    },
    {
      label: "Low Stock Items",
      value: data.lowStock,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-amber-500",
      glowColor: "group-hover:border-rose-500/50 shadow-rose-500/10",
      iconColor: data.lowStock > 0 
        ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 animate-pulse" 
        : "text-zinc-400 bg-zinc-500/10 border border-zinc-500/20",
    },
    {
      label: "Recent Movements",
      value: data.movements.length,
      icon: TrendingUp,
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "group-hover:border-cyan-500/50 shadow-cyan-500/10",
      iconColor: "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <p className="text-sm text-faint mt-1">Real-time indicators and recent warehousing movements.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`group relative bg-surface-blur border-surface rounded-2xl p-6 flex items-center gap-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-lg ${card.glowColor}`}
            >
              <div className={`p-3.5 rounded-xl ${card.iconColor} transition-colors duration-300`}>
                <Icon className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-faint uppercase tracking-wider">{card.label}</p>
                <p className="text-3xl font-extrabold text-default mt-0.5 tracking-tight">{card.value}</p>
              </div>
              <div className={`absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full`} />
            </div>
          );
        })}
      </div>

      {/* Charts & Detail Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Levels Bar Chart */}
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
            <span className="size-2 rounded-full bg-violet-400 shadow-md shadow-violet-400/50" />
            Stock Levels by Product
          </h2>
          {data.products.length > 0 ? (
            <div className="pt-2">
              <BarChartWidget data={data.products} />
            </div>
          ) : (
            <p className="text-faint text-center py-12">No products registered yet</p>
          )}
        </div>

        {/* Recent Movements list */}
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
            Recent Stock Activities
          </h2>
          {data.movements.length > 0 ? (
            <div className="space-y-4">
              {data.movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-surface border-surface hover:bg-zinc-900/10 transition-all duration-200"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-default truncate">{m.product_name}</p>
                    <p className="text-xs text-faint mt-0.5 truncate">{m.note || "No reference note"}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                      m.type === "IN"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/5"
                    }`}
                  >
                    {m.type === "IN" ? "Stock In +" : "Stock Out -"}
                    {m.quantity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-faint text-center py-12">No movements logged yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
