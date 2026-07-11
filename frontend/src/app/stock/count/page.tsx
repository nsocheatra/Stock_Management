import Link from "next/link";
import { db } from "@/server/db";
import { ClipboardCheck, Plus, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { requirePermission } from "@/server/auth";
import { T } from "@/components/T";
import ClearAuditsButton from "./ClearAuditsButton";

interface AuditRow {
  id: number;
  name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_items: number;
  counted_items: number;
  discrepancies: number;
}

export default async function StockCountListPage() {
  await requirePermission("audit.manage");
  const audits = await db.prepare(`
    SELECT
      a.id, a.name, a.status, a.created_at, a.completed_at,
      COUNT(ai.id) as total_items,
      SUM(CASE WHEN ai.actual_qty IS NOT NULL THEN 1 ELSE 0 END) as counted_items,
      SUM(CASE WHEN ai.difference != 0 THEN 1 ELSE 0 END) as discrepancies
    FROM physical_audits a
    LEFT JOIN physical_audit_items ai ON ai.audit_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all() as AuditRow[];

  const statusIcon: Record<string, typeof Loader2> = {
    in_progress: Loader2,
    completed: CheckCircle2,
    cancelled: XCircle,
  };
  const statusColors: Record<string, string> = {
    in_progress: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    cancelled: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="audit.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="audit.subtitle" /></p>
        </div>
        <div className="flex items-center gap-3">
          <ClearAuditsButton />
          <Link
            href="/stock/count/new"
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4.5 py-2.5 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-violet-500/10 border border-violet-500/20"
          >
            <Plus className="size-4" />
            <span className="text-sm font-semibold"><T k="audit.new" /></span>
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {audits.map((a) => {
          const StatusIcon = statusIcon[a.status] || Loader2;
          return (
            <Link
              key={a.id}
              href={`/stock/count/${a.id}`}
              className="bg-surface-blur border-surface rounded-2xl p-5 shadow-lg hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-default text-lg truncate">{a.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[a.status] || ""}`}>
                      <StatusIcon className="size-3" />
                      <T k={`audit.statuses.${a.status}` as any} />
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-faint">
                    <span>{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span><T k="audit.items" />: {a.total_items}</span>
                    <span><T k="audit.counted" />: {a.counted_items}/{a.total_items}</span>
                    {a.discrepancies > 0 && (
                      <span className="text-rose-400 font-semibold"><T k="audit.discrepancies" />: {a.discrepancies}</span>
                    )}
                  </div>
                </div>
                {a.status === "in_progress" && (
                  <ArrowRight className="size-5 text-muted group-hover:text-violet-400 transition-colors shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
        {audits.length === 0 && (
          <div className="text-center py-20 text-faint bg-surface-blur border-surface rounded-2xl">
            <ClipboardCheck className="size-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm"><T k="audit.empty" /></p>
            <Link href="/stock/count/new" className="text-xs text-violet-400 hover:underline mt-2 inline-block"><T k="audit.emptyCta" /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
