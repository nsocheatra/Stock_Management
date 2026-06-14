import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "../ProductForm";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  price: number;
  wholesale_price: number | null;
  unit_price: number | null;
  price_per_case: number | null;
  quantity: number;
  description: string | null;
  category: string | null;
  min_stock: number;
  supplier_id: number | null;
  barcode: string | null;
  image_url: string | null;
}


interface SupplierRow {
  id: number;
  name: string;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(parseInt(id)) as ProductRow | undefined;
  if (!product) notFound();

  const suppliers = db.prepare("SELECT id, name FROM suppliers ORDER BY name ASC").all() as SupplierRow[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">Edit Product</h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl">
        <ProductForm
          suppliers={suppliers}
          product={{ ...product, minStock: product.min_stock, supplierId: product.supplier_id }}
        />
      </div>
    </div>
  );
}

