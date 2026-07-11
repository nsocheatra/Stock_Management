import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { T } from "@/components/T";
import Link from "next/link";
import { Gem, Settings } from "lucide-react";

export default async function MembershipPage() {
  await requirePermission("membership.manage");
  const tiers = await db.prepare("SELECT * FROM membership_tiers ORDER BY min_spend ASC").all() as any[];
  const members = await db.prepare(`
    SELECT m.*, mt.name as tier_name, c.name as customer_name, c.phone, c.email
    FROM members m
    LEFT JOIN membership_tiers mt ON mt.id = m.tier_id
    LEFT JOIN customers c ON c.id = m.customer_id
    ORDER BY m.total_spent DESC LIMIT 50
  `).all() as any[];
  const stats = await db.prepare(`
    SELECT COUNT(*) as total, COALESCE(SUM(points),0) as total_points, COALESCE(SUM(total_spent),0) as total_spent
    FROM members
  `).get() as any;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="membership.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="membership.subtitle" /></p>
        </div>
        <div className="flex gap-2">
          <Link href="/membership/tiers" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/15 border border-amber-500/20">
            <Settings className="size-4" />
            <T k="membership.manageTiers" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-blur border-surface shadow-xl">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="membership.totalMembers" /></p>
          <p className="text-2xl font-bold text-default mt-1">{stats?.total || 0}</p>
        </div>
        <div className="p-5 rounded-xl bg-violet-500/5 border border-violet-500/10">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="membership.totalPoints" /></p>
          <p className="text-2xl font-bold text-violet-400 mt-1">{Math.round(stats?.total_points || 0)}</p>
        </div>
        <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="membership.totalSpent" /></p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${Number(stats?.total_spent || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tiers */}
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl p-5">
          <h3 className="text-sm font-semibold text-default mb-4"><T k="membership.tiers" /></h3>
          <div className="space-y-3">
            {tiers.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface">
                <div className="flex items-center gap-3">
                  <Gem className="size-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-default">{t.name}</p>
                    <p className="text-xs text-faint">{t.discount_percent}% {t.min_spend > 0 ? `(min $${t.min_spend})` : ""}</p>
                  </div>
                </div>
                <span className="text-xs text-faint">{t.benefits || "-"}</span>
              </div>
            ))}
            {tiers.length === 0 && <p className="text-xs text-faint text-center py-4"><T k="membership.noTiers" /></p>}
          </div>
        </div>

        {/* Top Members */}
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl p-5">
          <h3 className="text-sm font-semibold text-default mb-4"><T k="membership.topMembers" /></h3>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface">
                <div>
                  <p className="text-sm font-medium text-default">{m.customer_name}</p>
                  <p className="text-xs text-faint">{m.tier_name || "No tier"} · {Math.round(m.points)} pts</p>
                </div>
                <span className="text-xs font-semibold text-default">${Number(m.total_spent).toFixed(2)}</span>
              </div>
            ))}
            {members.length === 0 && <p className="text-xs text-faint text-center py-4"><T k="membership.empty" /></p>}
          </div>
        </div>
      </div>
    </div>
  );
}
