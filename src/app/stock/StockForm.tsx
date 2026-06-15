"use client";

import { useActionState } from "react";
import { createStockMovement } from "@/lib/actions";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

type Product = { id: number; name: string; sku: string; quantity: number };

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function StockForm({
  products,
  type,
}: {
  products: Product[];
  type: "IN" | "OUT";
}) {
  const { t } = useTranslation();
  const [, formAction] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      formData.set("type", type);
      await createStockMovement(formData);
    },
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="input-label">{t("stock.form.selectProduct")}</label>
        <select
          name="productId"
          required
          className="input-field"
        >
          <option value="" className="select-option">{t("stock.form.selectPlaceholder")}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} className="select-option">
              {t("stock.form.productOption", { name: p.name, sku: p.sku, qty: p.quantity })}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">
            {t("stock.form.quantity")} {type === "OUT" ? t("stock.form.outHint") : ""}
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            required
            placeholder={t("stock.form.qtyPlaceholder")}
            className="input-field"
          />
        </div>
        <div>
          <label className="input-label">{t("stock.form.date")}</label>
          <input
            name="date"
            type="date"
            defaultValue={todayStr()}
            className="input-field"
          />
        </div>
      </div>

      {type === "IN" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">{t("stock.form.quantityForCase")}</label>
              <input
                name="case_quantity"
                type="number"
                min="0"
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">{t("stock.form.costPerUnit")}</label>
              <input
                name="unit_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">{t("stock.form.costPerCase")}</label>
              <input
                name="case_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="input-field"
              />
            </div>
            <div />
          </div>
        </>
      )}

      <div>
        <label className="input-label">{t("stock.form.note")}</label>
        <input
          name="note"
          placeholder={t("stock.form.notePlaceholder")}
          className="input-field"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          className={`px-6 py-3 rounded-xl font-semibold cursor-pointer active:scale-[0.98] transition-all duration-200 text-sm border shadow-lg ${
            type === "IN"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/20 text-white shadow-emerald-500/15"
              : "bg-gradient-to-r from-rose-600 to-red-650 hover:from-rose-500 hover:to-red-600 border-rose-500/20 text-white shadow-rose-500/15"
          }`}
        >
          {type === "IN" ? t("stock.form.add") : t("stock.form.remove")}
        </button>
        <Link
          href="/stock"
          className="cancel-btn"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
