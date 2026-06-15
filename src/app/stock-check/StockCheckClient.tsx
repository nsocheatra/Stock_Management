"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { useRouter } from "next/navigation";
import { Check, X, Search } from "lucide-react";
import { updateStockCheckItem, completeStockCheck } from "@/lib/actions";

type Item = { id: number; product_id: number; expected_qty: number; actual_qty: number | null; difference: number | null; note: string | null; name: string; sku: string };

export default function StockCheckDetail({ checkId, items }: { checkId: number; items: Item[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    items.forEach((i) => { map[i.id] = i.actual_qty !== null ? String(i.actual_qty) : ""; });
    return map;
  });
  const [saving, setSaving] = useState<number | null>(null);

  const filtered = search
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()))
    : items;

  const countedCount = items.filter((i) => counts[i.id] !== "").length;
  const allCounted = countedCount === items.length;
  const hasDifferences = items.some((i) => {
    const actual = parseFloat(counts[i.id]);
    return !isNaN(actual) && actual !== i.expected_qty;
  });

  const saveItem = async (itemId: number) => {
    setSaving(itemId);
    const fd = new FormData();
    fd.set("item_id", String(itemId));
    fd.set("actual_qty", counts[itemId]);
    await updateStockCheckItem(fd);
    setSaving(null);
    router.refresh();
  };

  return (
    <div>
      <div className="p-4 border-b border-surface flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="input-field pl-10" />
        </div>
        <div className="text-xs text-faint">
          {countedCount}/{items.length} {t("stockCheck.counted")}
        </div>
      </div>

      <div className="overflow-auto max-h-[600px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-blur">
            <tr className="text-xs text-faint uppercase tracking-wider border-b border-surface">
              <th className="text-left p-4 font-medium">{t("common.name")}</th>
              <th className="text-center p-4 font-medium">{t("stockCheck.expected")}</th>
              <th className="text-center p-4 font-medium">{t("stockCheck.actual")}</th>
              <th className="text-center p-4 font-medium">{t("stockCheck.difference")}</th>
              <th className="text-center p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface">
            {filtered.map((item) => {
              const actual = parseFloat(counts[item.id]);
              const diff = isNaN(actual) ? null : actual - item.expected_qty;
              return (
                <tr key={item.id} className="hover:bg-surface/50 transition-colors text-sm">
                  <td className="p-4">
                    <p className="font-medium text-default">{item.name}</p>
                    <p className="text-xs text-faint font-mono">{item.sku}</p>
                  </td>
                  <td className="p-4 text-center text-default font-mono">{item.expected_qty}</td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      min="0"
                      value={counts[item.id]}
                      onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 text-center input-field text-sm py-1.5"
                      placeholder="-"
                    />
                  </td>
                  <td className="p-4 text-center">
                    {diff !== null && (
                      <span className={`font-mono font-semibold ${diff === 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-amber-400"}`}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => saveItem(item.id)}
                      disabled={saving === item.id || counts[item.id] === ""}
                      className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-all disabled:opacity-30 cursor-pointer"
                    >
                      <Check className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-surface flex items-center justify-between">
        <div className="text-xs text-faint">
          {hasDifferences && <span className="text-amber-400">{t("stockCheck.hasDiscrepancies")}</span>}
        </div>
        <div className="flex gap-2">
          {allCounted && (
            <form action={async (fd) => {
              fd.set("check_id", String(checkId));
              await completeStockCheck(fd);
              router.refresh();
            }}>
              <button type="submit" className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/15 cursor-pointer">
                {t("stockCheck.complete")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
