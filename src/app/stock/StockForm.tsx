"use client";

import { useActionState } from "react";
import { createStockMovement } from "@/lib/actions";
import Link from "next/link";

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
  const [state, formAction] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      formData.set("type", type);
      await createStockMovement(formData);
    },
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="input-label">Select Product</label>
        <select
          name="productId"
          required
          className="input-field"
        >
          <option value="" className="select-option">Select product to update</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} className="select-option">
              {p.name} ({p.sku}) - Current Stock: {p.quantity}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">
            Quantity {type === "OUT" ? "(must not exceed current stock)" : ""}
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            required
            placeholder="Enter quantity"
            className="input-field"
          />
        </div>
        <div>
          <label className="input-label">Date</label>
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
              <label className="input-label">Quantity for Case</label>
              <input
                name="case_quantity"
                type="number"
                min="0"
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Cost per Unit ($)</label>
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
              <label className="input-label">Cost per Case ($)</label>
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
        <label className="input-label">Note / Reference</label>
        <input
          name="note"
          placeholder="e.g. Purchase order #9213"
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
          {type === "IN" ? "Add Stock Entry" : "Remove Stock Entry"}
        </button>
        <Link
          href="/stock"
          className="cancel-btn"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
