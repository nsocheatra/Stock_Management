import { T } from "@/components/T";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "../ProductForm";
import VariantManager from "../VariantManager";

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
  const product = await db.prepare("SELECT * FROM products WHERE id = ?").get(parseInt(id)) as ProductRow | undefined;
  if (!product) notFound();

  const suppliers = await db.prepare("SELECT id, name FROM suppliers ORDER BY name ASC").all() as SupplierRow[];
  const variants = await db.prepare("SELECT id, name, sku, barcode, price, quantity FROM product_variants WHERE product_id = ? ORDER BY name ASC").all(parseInt(id)) as { id: number; name: string; sku: string | null; barcode: string | null; price: number | null; quantity: number }[];
  const keyword = await db.prepare("SELECT keyword, quantity FROM fb_keywords WHERE product_id = ?").get(parseInt(id)) as { keyword: string; quantity: number } | undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent"><T k="products.edit" /></h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl space-y-6">
        <ProductForm
          suppliers={suppliers}
          product={{ ...product, minStock: product.min_stock, supplierId: product.supplier_id, stream_key: keyword?.keyword, stream_qty: keyword?.quantity }}
        />
        <div className="border-t border-surface pt-6">
          <VariantManager productId={parseInt(id)} variants={variants} />
        </div>
      </div>
    </div>
  );
}

