import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Package, AlertTriangle, Warehouse, DollarSign, ArrowDownUp } from "lucide-react";
import { T } from "@/components/T";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  quantity: number;
  min_stock: number;
  category: string | null;
}

interface MovementRow {
  id: number;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product_name: string;
}

export default async function StockPage() {
  const products = await db.prepare(`
    SELECT id, name, sku, barcode, price, quantity, min_stock, category
    FROM products ORDER BY name ASC
  `).all() as ProductRow[];

  const movements = await db.prepare(`
    SELECT m.id, m.type, m.quantity, m.note, m.created_at, p.name as product_name
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    ORDER BY m.created_at DESC
    LIMIT 10
  `).all() as MovementRow[];

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.min_stock).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="stock.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="stock.subtitle" /></p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/stock/in"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4.5 py-2.5 rounded-xl hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all duration-200 shadow-lg shadow-emerald-500/10 border border-emerald-500/20"
          >
            <Plus className="size-4" />
            <span className="text-sm font-semibold"><T k="stock.stockIn" /></span>
          </Link>

        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-blur border-surface rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Package className="size-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="stock.kpi.totalProducts" /></p>
              <p className="text-2xl font-extrabold text-default mt-0.5">{totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-blur border-surface rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Warehouse className="size-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="stock.kpi.totalStock" /></p>
              <p className="text-2xl font-extrabold text-default mt-0.5">{totalStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-blur border-surface rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${lowStockCount > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-zinc-500/10 border-zinc-500/20"}`}>
              <AlertTriangle className={`size-5 ${lowStockCount > 0 ? "text-rose-400" : "text-zinc-400"}`} />
            </div>
            <div>
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="stock.kpi.lowStock" /></p>
              <p className={`text-2xl font-extrabold mt-0.5 ${lowStockCount > 0 ? "text-rose-400" : "text-default"}`}>{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-blur border-surface rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <DollarSign className="size-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-faint uppercase tracking-wider font-medium"><T k="stock.kpi.inventoryValue" /></p>
              <p className="text-2xl font-extrabold text-default mt-0.5">${inventoryValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="size-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">
            <T k="stock.lowStockAlert" vars={{ count: lowStockCount, be: lowStockCount > 1 ? "are" : "is" }} />
            <Link href="/products" className="ml-2 underline hover:text-rose-200"><T k="stock.viewProducts" /></Link>
          </p>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-surface flex items-center justify-between">
          <h2 className="text-sm font-semibold text-default"><T k="stock.currentInventory" /></h2>
          <span className="text-xs text-faint"><T k="stock.productCount" vars={{ count: products.length, plural: products.length !== 1 ? "s" : "" }} /></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface bg-header">
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider"><T k="stock.table.product" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider"><T k="stock.table.sku" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider"><T k="stock.table.barcode" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider"><T k="stock.table.category" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="stock.table.price" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="stock.table.onHand" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="stock.table.minStock" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="stock.table.value" /></th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="common.actions" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {products.map((p) => {
                const isLow = p.quantity <= p.min_stock;
                return (
                  <tr key={p.id} className="hover-surface transition-colors duration-150">
                    <td className="p-3 font-semibold text-default truncate max-w-[180px]">{p.name}</td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-default bg-surface px-2 py-0.5 rounded border border-surface">{p.sku}</span>
                    </td>
                    <td className="p-3 text-xs text-muted font-mono">{p.barcode || <span className="text-faint">-</span>}</td>
                    <td className="p-3 text-xs text-muted">{p.category || <span className="text-faint">-</span>}</td>
                    <td className="p-3 text-right text-sm font-semibold text-default">${p.price.toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <span className={`text-sm font-bold ${isLow ? "text-rose-400" : "text-emerald-400"}`}>{p.quantity}</span>
                    </td>
                    <td className="p-3 text-right text-sm text-faint">{p.min_stock}</td>
                    <td className="p-3 text-right text-sm font-semibold text-default">${(p.price * p.quantity).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href="/stock/in"
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted hover:text-emerald-400 transition-colors"
                          title="Stock In"
                        >
                          <Plus className="size-3.5" />
                        </Link>

                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-faint">
                    <Warehouse className="size-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm"><T k="stock.empty" /></p>
                    <Link href="/products/new" className="text-xs text-violet-400 hover:underline mt-1 inline-block"><T k="stock.emptyCta" /></Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-surface flex items-center justify-between">
          <h2 className="text-sm font-semibold text-default flex items-center gap-2">
            <ArrowDownUp className="size-4 text-muted" />
<T k="stock.recentMovements" />
          </h2>
          <Link href="/stock" className="text-xs text-violet-400 hover:underline"><T k="stock.viewAll" /></Link>
        </div>
        {movements.length > 0 ? (
          <div className="divide-y divide-surface">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 hover-surface transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-default truncate">{m.product_name}</p>
                  <p className="text-xs text-faint mt-0.5">
                    {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {m.note ? ` — ${m.note}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${
                  m.type === "IN"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                  {m.type === "IN" ? "+" : "-"}{m.quantity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-faint">
            <p className="text-sm"><T k="stock.noMovements" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
