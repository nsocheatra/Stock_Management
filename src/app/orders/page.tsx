import { db } from "@/lib/db";
import { T } from "@/components/T";
import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";
import OrderActions from "./OrderActions";

export default function OrdersPage() {
  const orders = db.prepare(`
    SELECT co.*, c.name as customer_name, c.phone as customer_phone,
      (SELECT COUNT(*) FROM customer_order_items WHERE order_id = co.id) as item_count
    FROM customer_orders co
    LEFT JOIN customers c ON c.id = co.customer_id
    ORDER BY co.created_at DESC LIMIT 100
  `).all() as any[];

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
          <Plus className="size-4" />
          <T k="orders.new" />
        </Link>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-blur">
              <tr className="text-xs text-faint uppercase tracking-wider border-b border-surface">
                <th className="text-left p-4 font-medium">#</th>
                <th className="text-left p-4 font-medium"><T k="orders.customer" /></th>
                <th className="text-right p-4 font-medium"><T k="orders.items" /></th>
                <th className="text-right p-4 font-medium"><T k="orders.total" /></th>
                <th className="text-center p-4 font-medium"><T k="orders.status" /></th>
                <th className="text-right p-4 font-medium"><T k="common.date" /></th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-surface/50 transition-colors text-sm">
                  <td className="p-4 font-mono text-xs text-faint">#{o.id}</td>
                  <td className="p-4 font-medium text-default">{o.customer_name || "Walk-in"}</td>
                  <td className="p-4 text-right text-default">{o.item_count}</td>
                  <td className="p-4 text-right font-semibold text-default">${Number(o.total).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      o.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                      o.status === "cancelled" ? "bg-rose-500/10 text-rose-400" :
                      o.status === "shipped" ? "bg-sky-500/10 text-sky-400" :
                      o.status === "processing" ? "bg-amber-500/10 text-amber-400" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      <T k={`orders.statuses.${o.status}`} />
                    </span>
                  </td>
                  <td className="p-4 text-right text-faint text-xs">{o.created_at?.slice(0, 10)}</td>
                  <td className="p-4 text-right">
                    <OrderActions orderId={o.id} saleId={o.sale_id} status={o.status} />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-faint text-sm">
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
