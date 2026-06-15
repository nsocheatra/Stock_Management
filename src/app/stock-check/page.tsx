import { db } from "@/lib/db";
import { T } from "@/components/T";
import Link from "next/link";
import { Plus, ClipboardCheck } from "lucide-react";

export default function StockCheckPage() {
  const checks = db.prepare(`
    SELECT sc.*, COUNT(sci.id) as item_count,
      SUM(CASE WHEN sci.actual_qty IS NOT NULL THEN 1 ELSE 0 END) as counted
    FROM stock_checks sc
    LEFT JOIN stock_check_items sci ON sci.stock_check_id = sc.id
    GROUP BY sc.id ORDER BY sc.created_at DESC
  `).all() as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="stockCheck.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="stockCheck.subtitle" /></p>
        </div>
        <Link href="/stock-check/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20">
          <Plus className="size-4" />
          <T k="stockCheck.new" />
        </Link>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface/50">
            <tr className="text-xs text-faint uppercase tracking-wider border-b border-surface">
              <th className="text-left p-4 font-medium"><T k="stockCheck.checkName" /></th>
              <th className="text-center p-4 font-medium"><T k="stockCheck.status" /></th>
              <th className="text-right p-4 font-medium"><T k="stockCheck.items" /></th>
              <th className="text-right p-4 font-medium"><T k="stockCheck.counted" /></th>
              <th className="text-right p-4 font-medium"><T k="common.date" /></th>
              <th className="text-right p-4 font-medium"><T k="common.actions" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface">
            {checks.map((c: any) => (
              <tr key={c.id} className="hover:bg-surface/50 transition-colors text-sm">
                <td className="p-4 font-medium text-default">{c.name}</td>
                <td className="p-4 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    c.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    c.status === "in_progress" ? "bg-amber-500/10 text-amber-400" :
                    "bg-zinc-500/10 text-zinc-400"
                  }`}>
                    <T k={`stockCheck.statuses.${c.status}`} />
                  </span>
                </td>
                <td className="p-4 text-right text-default">{c.item_count}</td>
                <td className="p-4 text-right text-default">{c.counted || 0}</td>
                <td className="p-4 text-right text-faint text-xs">{c.created_at?.slice(0, 10)}</td>
                <td className="p-4 text-right">
                  <Link href={`/stock-check/${c.id}`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    <T k="stockCheck.view" />
                  </Link>
                </td>
              </tr>
            ))}
            {checks.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-faint text-sm">
                <ClipboardCheck className="size-10 mx-auto mb-3 opacity-40" />
                <T k="stockCheck.empty" />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
