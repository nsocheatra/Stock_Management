"use client";

import { useActionState, useState } from "react";
import { createBatch } from "@/server/actions";
import Link from "next/link";

type Product = { id: number; name: string; sku: string };
type Location = { id: number; name: string };
type Variant = { id: number; name: string; sku: string | null; product_id: number };

export default function BatchForm({ products, locations, allVariants }: { products: Product[]; locations: Location[]; allVariants: Variant[] }) {
  const [, formAction] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      await createBatch(formData);
    },
    null
  );

  const [selectedProductId, setSelectedProductId] = useState("");
  const filteredVariants = allVariants.filter(v => v.product_id === parseInt(selectedProductId));

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="input-label">Product</label>
        <select name="product_id" required className="input-field" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          ))}
        </select>
      </div>
      {filteredVariants.length > 0 && (
        <div>
          <label className="input-label">Variant</label>
          <select name="variant_id" className="input-field">
            <option value="">-- No variant --</option>
            {filteredVariants.map((v) => (
              <option key={v.id} value={v.id}>{v.name}{v.sku ? ` (${v.sku})` : ""}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Batch / Lot No.</label>
          <input name="batch_no" required className="input-field" placeholder="e.g. BATCH-001" />
        </div>
        <div>
          <label className="input-label">Quantity</label>
          <input name="quantity" type="number" min="0" required className="input-field" placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Expiry Date</label>
          <input name="expiry_date" type="date" className="input-field" />
        </div>
        <div>
          <label className="input-label">Cost Price</label>
          <input name="cost_price" type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
        </div>
      </div>
      {locations.length > 0 && (
        <div>
          <label className="input-label">Location</label>
          <select name="location_id" className="input-field">
            <option value="">-- No location --</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/15 cursor-pointer">
          Create Batch
        </button>
        <Link href="/stock/batches" className="cancel-btn">Cancel</Link>
      </div>
    </form>
  );
}
