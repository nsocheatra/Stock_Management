import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { Layers } from "lucide-react";
import BatchForm from "../BatchForm";

export default async function NewBatchPage() {
  await requirePermission("stock.manage");
  const products = await db.prepare("SELECT id, name, sku FROM products WHERE track_batches = 1 ORDER BY name ASC").all() as { id: number; name: string; sku: string }[];
  const locations = await db.prepare("SELECT id, name FROM locations ORDER BY name ASC").all() as { id: number; name: string }[];
  const allVariants = await db.prepare("SELECT id, name, sku, product_id FROM product_variants ORDER BY name ASC").all() as { id: number; name: string; sku: string | null; product_id: number }[];

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <Layers className="size-6 text-cyan-400" />
          New Batch
        </h1>
        <p className="text-sm text-faint mt-1">Record a new stock batch or lot</p>
      </div>
      <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl">
        <BatchForm products={products} locations={locations} allVariants={allVariants} />
      </div>
    </div>
  );
}
