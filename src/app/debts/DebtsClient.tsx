"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { HandCoins, UserRound, Truck, Filter } from "lucide-react";

type Debt = { id: number; type: string; reference_id: number; amount: number; paid_amount: number; status: string; due_date: string | null; note: string | null; created_at: string; name: string; phone: string | null };

export default function DebtsClient({ debts }: { debts: Debt[] }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? debts : debts.filter((d) => d.status === filter);
  const totalOutstanding = debts.reduce((s, d) => s + (d.amount - d.paid_amount), 0);
  const customerDebts = debts.filter((d) => d.type === "customer").reduce((s, d) => s + (d.amount - d.paid_amount), 0);
  const supplierDebts = debts.filter((d) => d.type === "supplier").reduce((s, d) => s + (d.amount - d.paid_amount), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-surface">
        <div className="p-4 rounded-xl bg-surface border border-surface">
          <p className="text-xs text-faint uppercase tracking-wider">{t("debts.totalOutstanding")}</p>
          <p className="text-2xl font-bold text-default mt-1">${totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
          <p className="text-xs text-faint uppercase tracking-wider">{t("debts.fromCustomers")}</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">${customerDebts.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-xs text-faint uppercase tracking-wider">{t("debts.toSuppliers")}</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${supplierDebts.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-4 border-b border-surface flex items-center gap-2">
        <Filter className="size-4 text-muted" />
        {["all", "pending", "partial", "paid", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filter === s ? "bg-violet-600/20 text-violet-300" : "text-muted hover:text-default hover:bg-surface"}`}>
            {s === "all" ? t("common.all") : t(`debts.statuses.${s}`)}
          </button>
        ))}
      </div>

      <div className="overflow-auto max-h-[600px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-blur">
            <tr className="text-xs text-faint uppercase tracking-wider border-b border-surface">
              <th className="text-left p-4 font-medium">{t("debts.type")}</th>
              <th className="text-left p-4 font-medium">{t("debts.party")}</th>
              <th className="text-right p-4 font-medium">{t("debts.amount")}</th>
              <th className="text-right p-4 font-medium">{t("debts.paid")}</th>
              <th className="text-right p-4 font-medium">{t("debts.balance")}</th>
              <th className="text-center p-4 font-medium">{t("debts.status")}</th>
              <th className="text-right p-4 font-medium">{t("common.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface">
            {filtered.map((d) => {
              const balance = d.amount - d.paid_amount;
              return (
                <tr key={d.id} className="hover:bg-surface/50 transition-colors text-sm">
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${d.type === "customer" ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {d.type === "customer" ? <UserRound className="size-3" /> : <Truck className="size-3" />}
                      {t(`debts.types.${d.type}`)}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-default">{d.name || "-"}</td>
                  <td className="p-4 text-right text-default">${d.amount.toFixed(2)}</td>
                  <td className="p-4 text-right text-default">${d.paid_amount.toFixed(2)}</td>
                  <td className="p-4 text-right font-semibold text-default">${balance.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      d.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                      d.status === "partial" ? "bg-amber-500/10 text-amber-400" :
                      d.status === "cancelled" ? "bg-zinc-500/10 text-zinc-400" :
                      "bg-rose-500/10 text-rose-400"
                    }`}>
                      {t(`debts.statuses.${d.status}`)}
                    </span>
                  </td>
                  <td className="p-4 text-right text-faint text-xs">{d.created_at?.slice(0, 10)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center text-faint text-sm">{t("debts.empty")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
