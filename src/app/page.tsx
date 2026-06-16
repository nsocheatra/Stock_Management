import Link from "next/link";
import { db } from "@/lib/db";
import {
  Package, Truck, AlertTriangle, TrendingUp,
  HandCoins, Wallet, ReceiptText, Percent, Gem,
} from "lucide-react";
import BarChartWidget from "@/components/BarChartWidget";
import { T } from "@/components/T";

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
  pendingDebts: number;
  debtTotal: number;
  todayNet: number;
  pendingOrders: number;
  activePromotions: number;
  totalMembers: number;
  pendingDeliveries: number;
}

async function getDashboardData(): Promise<DashboardData> {
  const totalProducts = (await db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }).count;
  const totalSuppliers = (await db.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number }).count;
  const lowStock = (await db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity <= min_stock").get() as { count: number }).count;
  const movements = await db.prepare(`
    SELECT m.id, p.name as product_name, m.note, m.type, m.quantity
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    ORDER BY m.created_at DESC
    LIMIT 5
  `).all() as DashboardData["movements"];
  const products = await db.prepare("SELECT name, quantity FROM products ORDER BY quantity ASC LIMIT 10").all() as DashboardData["products"];

  const pendingDebts = (await db.prepare("SELECT COUNT(*) as count FROM debts WHERE status IN ('pending','partial')").get() as { count: number }).count;
  const debtRow = await db.prepare("SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM debts WHERE status IN ('pending','partial')").get() as { total: number };
  const todayRow = await db.prepare("SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as net FROM cash_flow WHERE date(created_at) = date('now')").get() as { net: number };
  const pendingOrders = (await db.prepare("SELECT COUNT(*) as count FROM customer_orders WHERE status NOT IN ('delivered','cancelled')").get() as { count: number }).count;
  const activePromotions = (await db.prepare("SELECT COUNT(*) as count FROM promotions WHERE active = 1").get() as { count: number }).count;
  const totalMembers = (await db.prepare("SELECT COUNT(*) as count FROM members").get() as { count: number }).count;
  const pendingDeliveries = (await db.prepare("SELECT COUNT(*) as count FROM deliveries WHERE status NOT IN ('delivered','failed')").get() as { count: number }).count;

  return {
    totalProducts, totalSuppliers, lowStock, movements, products,
    pendingDebts, debtTotal: debtRow.total, todayNet: todayRow.net,
    pendingOrders, activePromotions, totalMembers, pendingDeliveries,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const cards = [
    {
      label: <T k="dashboard.kpi.totalProducts" />,
      value: data.totalProducts,
      icon: Package,
      gradient: "from-violet-500 to-indigo-500",
      glowColor: "group-hover:border-violet-500/50 shadow-violet-500/10",
      iconColor: "text-violet-400 bg-violet-500/10 border border-violet-500/20",
    },
    {
      label: <T k="dashboard.kpi.suppliers" />,
      value: data.totalSuppliers,
      icon: Truck,
      gradient: "from-emerald-500 to-teal-500",
      glowColor: "group-hover:border-emerald-500/50 shadow-emerald-500/10",
      iconColor: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    },
    {
      label: <T k="dashboard.kpi.lowStock" />,
      value: data.lowStock,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-amber-500",
      glowColor: "group-hover:border-rose-500/50 shadow-rose-500/10",
      iconColor: data.lowStock > 0 
        ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 animate-pulse" 
        : "text-zinc-400 bg-zinc-500/10 border border-zinc-500/20",
    },
    {
      label: <T k="dashboard.kpi.recentMovements" />,
      value: data.movements.length,
      icon: TrendingUp,
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "group-hover:border-cyan-500/50 shadow-cyan-500/10",
      iconColor: "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
    },
    {
      label: <T k="dashboard.kpi.pendingDebts" />,
      value: data.pendingDebts,
      icon: HandCoins,
      gradient: "from-orange-500 to-red-500",
      glowColor: "group-hover:border-orange-500/50 shadow-orange-500/10",
      iconColor: "text-orange-400 bg-orange-500/10 border border-orange-500/20",
      sub: "$" + data.debtTotal.toFixed(2),
      href: "/debts",
    },
    {
      label: <T k="dashboard.kpi.todayNet" />,
      value: data.todayNet >= 0 ? "+$" + data.todayNet.toFixed(2) : "-$" + Math.abs(data.todayNet).toFixed(2),
      icon: Wallet,
      gradient: "from-green-500 to-emerald-500",
      glowColor: "group-hover:border-green-500/50 shadow-green-500/10",
      iconColor: "text-green-400 bg-green-500/10 border border-green-500/20",
      href: "/cash-flow",
    },
    {
      label: <T k="dashboard.kpi.pendingOrders" />,
      value: data.pendingOrders,
      icon: ReceiptText,
      gradient: "from-blue-500 to-indigo-500",
      glowColor: "group-hover:border-blue-500/50 shadow-blue-500/10",
      iconColor: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
      href: "/orders",
    },
    {
      label: <T k="dashboard.kpi.activePromotions" />,
      value: data.activePromotions,
      icon: Percent,
      gradient: "from-pink-500 to-rose-500",
      glowColor: "group-hover:border-pink-500/50 shadow-pink-500/10",
      iconColor: "text-pink-400 bg-pink-500/10 border border-pink-500/20",
      href: "/promotions",
    },
    {
      label: <T k="dashboard.kpi.totalMembers" />,
      value: data.totalMembers,
      icon: Gem,
      gradient: "from-amber-500 to-yellow-500",
      glowColor: "group-hover:border-amber-500/50 shadow-amber-500/10",
      iconColor: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
      href: "/membership",
    },
    {
      label: <T k="dashboard.kpi.pendingDeliveries" />,
      value: data.pendingDeliveries,
      icon: Truck,
      gradient: "from-cyan-500 to-teal-500",
      glowColor: "group-hover:border-cyan-500/50 shadow-cyan-500/10",
      iconColor: "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
      href: "/delivery",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          <T k="dashboard.title" />
        </h1>
        <p className="text-sm text-faint mt-1"><T k="dashboard.subtitle" /></p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const inner = (
            <div
              className={`group relative bg-surface-blur border-surface rounded-2xl p-6 flex items-center gap-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-lg ${card.glowColor} ${card.href ? 'cursor-pointer' : ''}`}
            >
              <div className={`p-3.5 rounded-xl ${card.iconColor} transition-colors duration-300`}>
                <Icon className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-faint uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-3xl font-extrabold text-default mt-0.5 tracking-tight">{card.value}</p>
                {card.sub && <p className="text-xs text-faint mt-0.5 truncate">{card.sub}</p>}
              </div>
              <div className={`absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full`} />
            </div>
          );
          return card.href ? <Link key={i} href={card.href}>{inner}</Link> : <div key={i}>{inner}</div>;
        })}
      </div>

      {/* Charts & Detail Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Levels Bar Chart */}
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
            <span className="size-2 rounded-full bg-violet-400 shadow-md shadow-violet-400/50" />
            <T k="dashboard.charts.stockLevels" />
          </h2>
          {data.products.length > 0 ? (
            <div className="pt-2">
              <BarChartWidget data={data.products} />
            </div>
          ) : (
            <p className="text-faint text-center py-12"><T k="dashboard.charts.noProducts" /></p>
          )}
        </div>

        {/* Recent Movements list */}
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <h2 className="text-lg font-semibold text-default mb-6 flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
            <T k="dashboard.charts.recentActivities" />
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
                    <p className="text-xs text-faint mt-0.5 truncate">{m.note || <T k="dashboard.noReference" />}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                      m.type === "IN"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/5"
                    }`}
                  >
                    {m.type === "IN" ? <T k="dashboard.movementIn" /> : <T k="dashboard.movementOut" />}
                    {m.quantity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-faint text-center py-12"><T k="dashboard.charts.noMovements" /></p>
          )}
        </div>
      </div>
    </div>
  );
}
