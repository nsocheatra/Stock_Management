import { db } from "@/lib/db";
import { T } from "@/components/T";
import { createDelivery } from "@/lib/actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewDeliveryPage() {
  const partners = await db.prepare("SELECT id, name FROM delivery_partners WHERE active = 1 ORDER BY name ASC").all() as any[];
  const orders = await db.prepare(`
    SELECT co.id, co.total, c.name as customer_name
    FROM customer_orders co
    LEFT JOIN customers c ON c.id = co.customer_id
    WHERE co.status NOT IN ('cancelled', 'delivered')
    ORDER BY co.created_at DESC LIMIT 50
  `).all() as any[];

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/delivery" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="delivery.new" />
          </h1>
        </div>
      </div>

      <form action={createDelivery} className="bg-surface-blur border-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <label className="input-label"><T k="orders.customer" /></label>
          <select name="order_id" className="input-field appearance-none">
            <option value="">-- No order --</option>
            {orders.map((o: any) => (
              <option key={o.id} value={o.id}>#{o.id} {o.customer_name || "Walk-in"} — ${o.total}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label"><T k="delivery.partner" /></label>
          <select name="partner_id" className="input-field appearance-none">
            <option value="">-- Select --</option>
            {partners.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label"><T k="delivery.deliveryFee" /></label>
          <input name="fee" type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
        </div>

        <div>
          <label className="input-label"><T k="common.note" /></label>
          <textarea name="note" rows={2} className="input-field resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/delivery" className="flex-1 py-3 rounded-xl font-medium text-sm border border-surface text-muted hover:text-default hover:bg-surface transition-all text-center"><T k="common.cancel" /></Link>
          <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer"><T k="common.save" /></button>
        </div>
      </form>
    </div>
  );
}
