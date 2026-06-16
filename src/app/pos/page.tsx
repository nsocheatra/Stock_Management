import { db } from "@/lib/db";
import POSClient from "./POSClient";
import { T } from "@/components/T";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  wholesale_price: number | null;
  selling_price: number | null;
  original_price: number | null;
  unit_price: number | null;
  price_per_case: number | null;
  quantity: number;
  image_url: string | null;
  category: string | null;
}

interface CustomerRow {
  id: number;
  name: string;
  customer_type: string;
}

export default async function POSPage() {
  const products = await db.prepare("SELECT id, name, sku, barcode, price, wholesale_price, selling_price, original_price, unit_price, price_per_case, quantity, image_url, category FROM products ORDER BY name ASC").all() as ProductRow[];
  const customers = await db.prepare("SELECT id, name, customer_type FROM customers ORDER BY name ASC").all() as CustomerRow[];

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="pos.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="pos.subtitle" /></p>
        </div>
      </div>
      <div className="flex-1 bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <POSClient products={products} customers={customers} />
      </div>
    </div>
  );
}
