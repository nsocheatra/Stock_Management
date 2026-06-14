import { db } from "@/lib/db";
import StockForm from "../StockForm";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  quantity: number;
}

export default function StockOutPage() {
  const products = db.prepare("SELECT id, name, sku, quantity FROM products ORDER BY name ASC").all() as ProductRow[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">Stock Out Entry</h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl">
        <StockForm products={products} type="OUT" />
      </div>
    </div>
  );
}
