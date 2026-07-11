import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { T } from "@/components/T";
import Link from "next/link";
import { Plus, Percent, Gift } from "lucide-react";

export default async function PromotionsPage() {
  await requirePermission("promotions.manage");
  const now = new Date().toISOString().slice(0, 10);
  const promotions = await db.prepare("SELECT * FROM promotions ORDER BY created_at DESC").all() as any[];
  const activeCount = promotions.filter((p: any) => p.active && (!p.end_date || p.end_date >= now)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="promotions.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="promotions.subtitle" /></p>
        </div>
        <div className="flex gap-2">
          <Link href="/promotions/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20">
            <Plus className="size-4" />
            <T k="promotions.new" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-blur border-surface shadow-xl">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="promotions.total" /></p>
          <p className="text-2xl font-bold text-default mt-1">{promotions.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="promotions.active" /></p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((p: any) => {
          const isExpired = p.end_date && p.end_date < now;
          return (
            <div key={p.id} className={`p-5 rounded-xl border transition-all ${isExpired ? "bg-surface border-surface opacity-50" : "bg-surface-blur border-surface shadow-xl hover:border-violet-500/30"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Percent className="size-4 text-violet-400" />
                  <h3 className="font-semibold text-default text-sm">{p.name}</h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.active && !isExpired ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                  {p.active && !isExpired ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-xs text-faint">
                <p><T k="promotions.type" />: <span className="text-default">{p.type}</span></p>
                <p><T k="promotions.value" />: <span className="text-default font-semibold">{p.type === "percentage" ? `${p.value}%` : `$${p.value}`}</span></p>
                {p.min_purchase > 0 && <p><T k="promotions.minPurchase" />: <span className="text-default">${p.min_purchase}</span></p>}
                {p.start_date && <p>{p.start_date} → {p.end_date || "∞"}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/promotions/${p.id}`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors"><T k="common.edit" /></Link>
              </div>
            </div>
          );
        })}
        {promotions.length === 0 && (
          <div className="col-span-full text-center py-16 text-faint">
            <Gift className="size-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm"><T k="promotions.empty" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
