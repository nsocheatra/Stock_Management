import { T } from "@/components/T";
import { db } from "@/server/db";
import StockForm from "../StockForm";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  quantity: number;
}

export default async function StockInPage() {
  const products = await db.prepare("SELECT id, name, sku, quantity FROM products ORDER BY name ASC").all() as ProductRow[];
  const locations = await db.prepare("SELECT id, name FROM locations ORDER BY name ASC").all() as { id: number; name: string }[];
  const batches = await db.prepare("SELECT id, batch_no, quantity, expiry_date FROM batches ORDER BY batch_no DESC").all() as { id: number; batch_no: string; quantity: number; expiry_date: string | null }[];
  const variants = await db.prepare("SELECT id, name, sku FROM product_variants ORDER BY name ASC").all() as { id: number; name: string; sku: string | null }[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent"><T k="stock.stockInEntry" /></h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl">
        <StockForm products={products} type="IN" locations={locations} batches={batches} variants={variants} />
      </div>
    </div>
  );
}
