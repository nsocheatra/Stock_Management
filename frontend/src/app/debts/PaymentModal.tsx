"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { X, Plus } from "lucide-react";
import { addDebtPayment } from "@/server/actions";
import { useRouter } from "next/navigation";

export default function PaymentModal({ debtId, debtAmount, paidAmount, onClose }: { debtId: number; debtAmount: number; paidAmount: number; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [amount, setAmount] = useState((debtAmount - paidAmount).toFixed(2));
  const balance = debtAmount - paidAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-default">{t("debts.addPayment")}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted cursor-pointer"><X className="size-4" /></button>
        </div>
        <form action={async (fd) => {
          fd.set("debt_id", String(debtId));
          await addDebtPayment(fd);
          router.refresh();
          onClose();
        }} className="space-y-4">
          <div className="text-center">
            <p className="text-xs text-faint">{t("debts.balance")}: <span className="text-default font-semibold">${balance.toFixed(2)}</span></p>
          </div>
          <div>
            <label className="input-label">{t("debts.paymentAmount")}</label>
            <input name="amount" type="number" step="0.01" min="0.01" max={balance} required value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field text-lg font-bold text-center" />
          </div>
          <div>
            <label className="input-label">{t("common.note")}</label>
            <input name="note" className="input-field" placeholder="Optional" />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 cursor-pointer">
            <Plus className="size-4" />
            {t("debts.recordPayment")}
          </button>
        </form>
      </div>
    </div>
  );
}
