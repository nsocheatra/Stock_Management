import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { T } from "@/components/T";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";

export default async function DeliveryPage() {
  await requirePermission("delivery.manage");
  const partners = await db.prepare("SELECT * FROM delivery_partners ORDER BY name ASC").all() as any[];
  const deliveries = await db.prepare(`
    SELECT d.*, dp.name as partner_name, co.total as order_total,
      c.name as customer_name
    FROM deliveries d
    LEFT JOIN delivery_partners dp ON dp.id = d.partner_id
    LEFT JOIN customer_orders co ON co.id = d.order_id
    LEFT JOIN customers c ON c.id = co.customer_id
    ORDER BY d.created_at DESC LIMIT 100
  `).all() as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="delivery.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="delivery.subtitle" /></p>
        </div>
        <div className="flex gap-2">
          <Link href="/delivery/partners" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/15 border border-emerald-500/20">
            <Truck className="size-4" />
            <T k="delivery.managePartners" />
          </Link>
          <Link href="/delivery/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20">
            <Plus className="size-4" />
            <T k="delivery.new" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl p-5">
          <h3 className="text-sm font-semibold text-default mb-3"><T k="delivery.partners" /></h3>
          <div className="space-y-2">
            {partners.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface">
                <div>
                  <p className="text-sm font-medium text-default">{p.name}</p>
                  <p className="text-xs text-faint">{p.phone}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {partners.length === 0 && <p className="text-xs text-faint text-center py-4"><T k="delivery.noPartners" /></p>}
          </div>
        </div>

        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl p-5">
          <h3 className="text-sm font-semibold text-default mb-3"><T k="delivery.recentDeliveries" /></h3>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {deliveries.slice(0, 10).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface">
                <div>
                  <p className="text-sm font-medium text-default">{d.customer_name || "-"}</p>
                  <p className="text-xs text-faint">{d.partner_name || "Unassigned"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  d.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                  d.status === "failed" ? "bg-rose-500/10 text-rose-400" :
                  d.status === "in_transit" ? "bg-sky-500/10 text-sky-400" :
                  "bg-zinc-500/10 text-zinc-400"
                }`}>
                  <T k={`delivery.statuses.${d.status}`} />
                </span>
              </div>
            ))}
            {deliveries.length === 0 && <p className="text-xs text-faint text-center py-4"><T k="delivery.empty" /></p>}
          </div>
        </div>
      </div>
    </div>
  );
}
