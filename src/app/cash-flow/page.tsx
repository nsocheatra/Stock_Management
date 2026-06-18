import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { T } from "@/components/T";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CashFlowPage() {
  await requirePermission("cashflow.manage");
  const entries = await db.prepare("SELECT * FROM cash_flow ORDER BY created_at DESC LIMIT 200").all() as any[];
  const totalIncome = await db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM cash_flow WHERE type = 'income'").get() as any;
  const totalExpense = await db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM cash_flow WHERE type = 'expense'").get() as any;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="cashFlow.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="cashFlow.subtitle" /></p>
        </div>
        <Link href="/cash-flow/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20">
          <Plus className="size-4" />
          <T k="cashFlow.add" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-blur border-surface shadow-xl">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="cashFlow.totalIncome" /></p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${Number(totalIncome.total).toFixed(2)}</p>
        </div>
        <div className="p-5 rounded-xl bg-surface-blur border-surface shadow-xl">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="cashFlow.totalExpense" /></p>
          <p className="text-2xl font-bold text-rose-400 mt-1">${Number(totalExpense.total).toFixed(2)}</p>
        </div>
        <div className="p-5 rounded-xl bg-surface-blur border-surface shadow-xl">
          <p className="text-xs text-faint uppercase tracking-wider"><T k="cashFlow.net" /></p>
          <p className={`text-2xl font-bold mt-1 ${Number(totalIncome.total) - Number(totalExpense.total) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${(Number(totalIncome.total) - Number(totalExpense.total)).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-blur">
              <tr className="text-xs text-faint uppercase tracking-wider border-b border-surface">
                <th className="text-left p-4 font-medium"><T k="common.date" /></th>
                <th className="text-left p-4 font-medium"><T k="cashFlow.type" /></th>
                <th className="text-left p-4 font-medium"><T k="cashFlow.category" /></th>
                <th className="text-left p-4 font-medium"><T k="cashFlow.description" /></th>
                <th className="text-right p-4 font-medium"><T k="cashFlow.amount" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {entries.map((e: any) => (
                <tr key={e.id} className="hover:bg-surface/50 transition-colors text-sm">
                  <td className="p-4 text-faint text-xs">{e.created_at?.slice(0, 10)}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${e.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {e.type === "income" ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td className="p-4 text-default">{e.category}</td>
                  <td className="p-4 text-faint">{e.description || "-"}</td>
                  <td className={`p-4 text-right font-semibold ${e.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {e.type === "income" ? "+" : "-"}${Number(e.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-faint text-sm"><T k="cashFlow.empty" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
