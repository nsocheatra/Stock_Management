import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { T } from "@/components/T";
import Link from "next/link";
import { ShoppingCart, ReceiptText } from "lucide-react";
import OrderActions from "./OrderActions";

interface OrderEntry {
  id: number;
  type: "order" | "pos";
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  item_count: number;
  total: number;
  status: string;
  created_at: string;
  sale_id: number | null;
  payment_method: string | null;
}

export default async function OrdersPage() {
  await requirePermission("orders.manage");

  const orders = await db.prepare(`
    SELECT co.id, 'order' as type, co.customer_id, c.name as customer_name, c.phone as customer_phone,
      (SELECT COUNT(*) FROM customer_order_items WHERE order_id = co.id) as item_count,
      co.total, co.status, co.created_at, co.sale_id, NULL as payment_method
    FROM customer_orders co
    LEFT JOIN customers c ON c.id = co.customer_id
  `).all() as any[];

  const posSales = await db.prepare(`
    SELECT s.id, 'pos' as type, s.customer_id, c.name as customer_name, c.phone as customer_phone,
      s.item_count, s.total, 'completed' as status, s.created_at, NULL as sale_id, s.payment_method
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
  `).all() as any[];

  const entries: OrderEntry[] = [...orders, ...posSales].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="orders.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="orders.subtitle" /></p>
        </div>
        <Link href="/orders/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20">
          <ShoppingCart className="size-4" />
          <T k="orders.new" />
        </Link>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-blur">
              <tr className="text-xs text-faint uppercase tracking-wider border-b border-surface">
                <th className="text-left p-4 font-medium">#</th>
                <th className="text-left p-4 font-medium"><T k="common.type" /></th>
                <th className="text-left p-4 font-medium"><T k="orders.customer" /></th>
                <th className="text-right p-4 font-medium"><T k="orders.items" /></th>
                <th className="text-right p-4 font-medium"><T k="orders.total" /></th>
                <th className="text-center p-4 font-medium"><T k="orders.status" /></th>
                <th className="text-right p-4 font-medium"><T k="common.date" /></th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {entries.map((e) => (
                <tr key={`${e.type}-${e.id}`} className="hover:bg-surface/50 transition-colors text-sm">
                  <td className="p-4 font-mono text-xs text-faint">#{e.id}</td>
                  <td className="p-4">
                    {e.type === "pos" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        POS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                        Order
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-medium text-default">{e.customer_name || "Walk-in"}</td>
                  <td className="p-4 text-right text-default">{e.item_count}</td>
                  <td className="p-4 text-right font-semibold text-default">${Number(e.total).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    {e.type === "pos" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400">
                        Completed
                      </span>
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        e.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                        e.status === "cancelled" ? "bg-rose-500/10 text-rose-400" :
                        e.status === "shipped" ? "bg-sky-500/10 text-sky-400" :
                        e.status === "processing" ? "bg-amber-500/10 text-amber-400" :
                        "bg-zinc-500/10 text-zinc-400"
                      }`}>
                        <T k={`orders.statuses.${e.status}`} />
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right text-faint text-xs">{e.created_at?.slice(0, 10)}</td>
                  <td className="p-4 text-right">
                    {e.type === "order" ? (
                      <OrderActions orderId={e.id} saleId={e.sale_id} status={e.status} />
                    ) : (
                      <a
                        href={`/pos?receipt=${e.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      >
                        <ReceiptText className="size-3" />
                        View Receipt
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-faint text-sm">
                  <ReceiptText className="size-10 mx-auto mb-3 opacity-40" />
                  <T k="orders.empty" />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
