import { db } from "@/lib/db";
import { T } from "@/components/T";
import Link from "next/link";
import { ArrowLeft, Gem, Plus } from "lucide-react";
import { createMembershipTier } from "@/lib/actions";

export default async function TiersPage() {
  const tiers = await db.prepare("SELECT * FROM membership_tiers ORDER BY min_spend ASC").all() as any[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/membership" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="membership.manageTiers" />
          </h1>
        </div>
      </div>

      <form action={createMembershipTier} className="bg-surface-blur border-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-semibold text-default"><Plus className="size-4 inline" /> <T k="membership.addTier" /></h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label"><T k="common.name" /></label>
            <input name="name" required className="input-field" placeholder="Gold" />
          </div>
          <div>
            <label className="input-label"><T k="membership.discountPercent" /></label>
            <input name="discount_percent" type="number" step="0.1" min="0" max="100" className="input-field" placeholder="5" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label"><T k="membership.minSpend" /></label>
            <input name="min_spend" type="number" step="0.01" min="0" className="input-field" placeholder="100.00" />
          </div>
          <div>
            <label className="input-label"><T k="membership.benefits" /></label>
            <input name="benefits" className="input-field" placeholder="Free delivery, priority support" />
          </div>
        </div>
        <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer"><T k="common.save" /></button>
      </form>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-surface">
          <h3 className="text-sm font-semibold text-default"><T k="membership.existingTiers" /></h3>
        </div>
        <div className="divide-y divide-surface">
          {tiers.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Gem className="size-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-default">{t.name}</p>
                  <p className="text-xs text-faint">{t.discount_percent}% off · Min spend: ${t.min_spend}</p>
                </div>
              </div>
              <span className="text-xs text-faint">{t.benefits || "-"}</span>
            </div>
          ))}
          {tiers.length === 0 && <p className="p-8 text-center text-xs text-faint"><T k="membership.noTiers" /></p>}
        </div>
      </div>
    </div>
  );
}
