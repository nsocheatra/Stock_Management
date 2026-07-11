import { db } from "@/server/db";
import { T } from "@/components/T";
import Link from "next/link";
import { ArrowLeft, Plus, Truck } from "lucide-react";
import { createDeliveryPartner } from "@/server/actions";

export default async function PartnersPage() {
  const partners = await db.prepare("SELECT * FROM delivery_partners ORDER BY name ASC").all() as any[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/delivery" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="delivery.partners" />
          </h1>
        </div>
      </div>

      <form action={createDeliveryPartner} className="bg-surface-blur border-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-semibold text-default"><Plus className="size-4 inline" /> <T k="delivery.addPartner" /></h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label"><T k="common.name" /></label>
            <input name="name" required className="input-field" />
          </div>
          <div>
            <label className="input-label"><T k="common.phone" /></label>
            <input name="phone" className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label"><T k="delivery.commissionType" /></label>
            <select name="commission_type" className="input-field appearance-none">
              <option value="fixed">Fixed ($)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label className="input-label"><T k="delivery.commissionValue" /></label>
            <input name="commission_value" type="number" step="0.01" min="0" className="input-field" />
          </div>
        </div>
        <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer"><T k="common.save" /></button>
      </form>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-surface">
          <h3 className="text-sm font-semibold text-default"><T k="delivery.partners" /></h3>
        </div>
        <div className="divide-y divide-surface">
          {partners.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Truck className="size-5 text-violet-400" />
                <div>
                  <p className="text-sm font-medium text-default">{p.name}</p>
                  <p className="text-xs text-faint">{p.phone || "-"} · {p.commission_type === "fixed" ? `$${p.commission_value}` : `${p.commission_value}%`}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                {p.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
          {partners.length === 0 && <p className="p-8 text-center text-xs text-faint"><T k="delivery.noPartners" /></p>}
        </div>
      </div>
    </div>
  );
}
