"use client";

import { useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { updateAuditItem, completeAudit, applyAuditCorrections, cancelAudit } from "@/lib/actions";
import { CheckCircle2, Save, AlertTriangle, ClipboardCheck } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface AuditItem {
  id: number;
  product_name: string;
  sku: string;
  expected_qty: number;
  actual_qty: number | null;
  difference: number | null;
  note: string | null;
  variant_id: number | null;
  variant_name: string | null;
  variant_sku: string | null;
  batch_id: number | null;
  batch_no: string | null;
  expiry_date: string | null;
  location_name: string | null;
  has_variants: number;
  track_batches: number;
}

export default function AuditCountClient({
  items: initialItems,
  auditId,
  auditStatus,
}: {
  items: AuditItem[];
  auditId: number;
  auditStatus: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useOptimistic(initialItems, (_state, updatedItem: AuditItem) =>
    _state.map(i => i.id === updatedItem.id ? updatedItem : i)
  );

  const counted = items.filter(i => i.actual_qty !== null).length;
  const discrepancies = items.filter(i => i.difference !== null && i.difference !== 0);
  const hasVariants = items.some(i => i.variant_name);
  const hasBatches = items.some(i => i.batch_no);
  const hasExpiry = items.some(i => i.expiry_date);

  async function handleUpdate(formData: FormData) {
    const itemId = parseInt(formData.get("item_id") as string);
    const actualQty = parseInt(formData.get("actual_qty") as string);
    if (isNaN(itemId) || isNaN(actualQty)) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const difference = actualQty - item.expected_qty;
    setItems({ ...item, actual_qty: actualQty, difference });
    await updateAuditItem(formData);
  }

  const allCounted = counted === items.length;

  return (
    <div className="space-y-6">
      {/* Progress + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-48 h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${items.length ? (counted / items.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-faint font-medium">{counted}/{items.length} {t("audit.counted")}</span>
        </div>
        <div className="flex gap-2">
          {auditStatus === "in_progress" && (
            <form action={async (fd: FormData) => {
              if (!confirm("Cancel this stock count?")) return;
              fd.set("audit_id", String(auditId)); await cancelAudit(fd); router.refresh();
            }}>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                Cancel Count
              </button>
            </form>
          )}
          {auditStatus === "in_progress" && allCounted && (
            <form action={async (fd: FormData) => {
              if (!confirm("Complete this stock count? This will lock all values.")) return;
              fd.set("audit_id", String(auditId)); await completeAudit(fd); router.refresh();
            }}>
              <button
                type="submit"
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
              >
                <CheckCircle2 className="size-4" />
                {t("audit.complete")}
              </button>
            </form>
          )}
          {auditStatus === "completed" && discrepancies.length > 0 && (
            <form action={async (fd: FormData) => {
              if (!confirm("Apply corrections? This will update product stock quantities.")) return;
              fd.set("audit_id", String(auditId)); await applyAuditCorrections(fd); router.refresh();
            }}>
              <button
                type="submit"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-amber-500 hover:to-orange-500 active:scale-95 transition-all"
              >
                <AlertTriangle className="size-4" />
                {t("audit.applyCorrections")}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface bg-header">
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">{t("audit.table.product")}</th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">{t("audit.table.sku")}</th>
                {hasVariants && <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">Variant</th>}
                {hasBatches && <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">Batch</th>}
                {hasExpiry && <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">Expiry</th>}
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right">{t("audit.table.expected")}</th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right">{t("audit.table.actual")}</th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right">{t("audit.table.difference")}</th>
                <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">{t("audit.table.note")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {items.map((item) => {
                const hasDiscrepancy = item.difference !== null && item.difference !== 0;
                return (
                  <tr key={item.id} className={`hover-surface transition-colors ${hasDiscrepancy ? "bg-rose-500/5" : ""}`}>
                    <form
                      action={handleUpdate}
                      className="contents"
                    >
                      <input type="hidden" name="item_id" value={item.id} />
                      <td className="p-3 font-semibold text-default truncate max-w-[200px]">{item.product_name}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs text-default bg-surface px-2 py-0.5 rounded border border-surface">{item.sku}</span>
                      </td>
                      {hasVariants && (
                        <td className="p-3">
                          <span className="text-xs text-default">{item.variant_name || "-"}</span>
                        </td>
                      )}
                      {hasBatches && (
                        <td className="p-3">
                          <span className="font-mono text-xs text-default bg-surface px-2 py-0.5 rounded border border-surface">{item.batch_no || "-"}</span>
                        </td>
                      )}
                      {hasExpiry && (
                        <td className="p-3">
                          <span className="text-xs text-default">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}</span>
                        </td>
                      )}
                      <td className="p-3 text-right text-sm text-default font-medium">{item.expected_qty}</td>
                      <td className="p-3 text-right">
                          <input
                            name="actual_qty"
                            type="number"
                            step="1"
                            min="0"
                            defaultValue={item.actual_qty ?? item.expected_qty}
                            placeholder={t("audit.count")}
                            disabled={auditStatus !== "in_progress"}
                            className="w-24 px-2.5 py-1.5 rounded-lg bg-surface border border-surface text-default text-right text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all disabled:opacity-50"
                          />
                      </td>
                      <td className="p-3 text-right">
                        {item.difference !== null ? (
                          <span className={`text-sm font-bold ${item.difference === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {item.difference > 0 ? "+" : ""}{item.difference}
                          </span>
                        ) : (
                          <span className="text-faint text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          name="note"
                          defaultValue={item.note ?? ""}
                          placeholder={t("audit.notePlaceholder")}
                          disabled={auditStatus !== "in_progress"}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-surface text-default text-xs placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all disabled:opacity-50"
                        />
                      </td>
                      <td className="p-3">
                        {auditStatus === "in_progress" && (
                          <button
                            type="submit"
                            className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-all active:scale-95"
                            title={t("common.save")}
                          >
                            <Save className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </form>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {auditStatus === "completed" && discrepancies.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <ClipboardCheck className="size-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">{t("audit.noDiscrepancies")}</p>
        </div>
      )}
    </div>
  );
}
