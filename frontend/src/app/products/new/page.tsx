import { T } from "@/components/T";
import { db } from "@/server/db";
import ProductForm from "../ProductForm";

interface SupplierRow {
  id: number;
  name: string;
}

export default async function NewProductPage() {
  const suppliers = await db.prepare("SELECT id, name FROM suppliers ORDER BY name ASC").all() as SupplierRow[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent"><T k="products.new" /></h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl">
        <ProductForm suppliers={suppliers} />
      </div>
    </div>
  );
}

