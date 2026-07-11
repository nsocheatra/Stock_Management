"use client";

import { useActionState } from "react";
import { createVariant, deleteVariant } from "@/server/actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Layers } from "lucide-react";

type Variant = { id: number; name: string; sku: string | null; barcode: string | null; price: number | null; quantity: number };

export default function VariantManager({ productId, variants }: { productId: number; variants: Variant[] }) {
  const router = useRouter();
  const [, addAction] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      formData.set("product_id", String(productId));
      await createVariant(formData);
      router.refresh();
    },
    null
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this variant?")) return;
    await deleteVariant(id);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-default flex items-center gap-2">
          <Layers className="size-4 text-muted" />
          Variants
        </h3>
        <span className="text-xs text-faint">{variants.length} variant(s)</span>
      </div>

      {variants.length > 0 && (
        <div className="divide-y divide-surface border border-[var(--border-color)] rounded-xl">
          {variants.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 hover-surface transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-default">{v.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                  {v.sku && <span className="font-mono">{v.sku}</span>}
                  {v.barcode && <span className="font-mono">{v.barcode}</span>}
                  {v.price != null && <span>${v.price.toFixed(2)}</span>}
                  <span>Stock: {v.quantity}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form action={addAction} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input name="name" required placeholder="e.g. Red / Large" className="input-field text-xs" />
        <input name="sku" placeholder="SKU" className="input-field text-xs" />
        <input name="price" type="number" step="0.01" placeholder="Price" className="input-field text-xs" />
        <button type="submit" className="px-3 py-2 rounded-xl font-semibold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1">
          <Plus className="size-3" />
          Add
        </button>
      </form>
    </div>
  );
}
