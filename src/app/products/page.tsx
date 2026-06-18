import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Edit, Package, Image as ImageIcon } from "lucide-react";
import DeleteProductButton from "./DeleteButton";
import ProductImage from "./ProductImage";
import { requirePermission } from "@/lib/auth";
import { T } from "@/components/T";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  wholesale_price: number | null;
  unit_price: number | null;
  price_per_case: number | null;
  quantity: number;
  category: string | null;
  min_stock: number;
  supplier_name: string | null;
  image_url: string | null;
  has_variants: number;
  track_batches: number;
  variant_count: number;
}

export default async function ProductsPage() {
  await requirePermission("products.manage");
  const products = await db.prepare(`
    SELECT p.id, p.name, p.sku, p.barcode, p.price, p.wholesale_price, p.unit_price, p.price_per_case, p.quantity, p.category, p.min_stock, p.image_url, p.has_variants, p.track_batches,
      (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count,
      s.name as supplier_name
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    ORDER BY p.name ASC
  `).all() as ProductRow[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="products.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="products.subtitle" /></p>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4.5 py-2.5 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-violet-500/10 border border-violet-500/20"
        >
          <Plus className="size-4" />
          <span className="text-sm font-semibold"><T k="products.add" /></span>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-surface border-surface rounded-2xl">
          <Package className="size-14 mx-auto mb-4 text-muted opacity-70" />
          <p className="text-lg text-default font-medium"><T k="products.empty" /></p>
          <p className="text-sm text-faint mt-1 mb-4"><T k="products.emptyHint" /></p>
          <Link
            href="/products/new"
            className="text-violet-400 hover:text-violet-300 font-semibold text-sm hover:underline"
          >
            <T k="products.emptyCta" />
          </Link>
        </div>
      ) : (
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface bg-header">
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="products.table.image" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="products.table.productName" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="products.table.sku" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="products.table.barcode" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="products.table.category" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="products.table.unit" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="products.table.perCase" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="products.table.quantity" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="products.table.supplier" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="common.actions" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {products.map((p) => {
                  const isLowStock = p.quantity <= p.min_stock;
                  return (
                    <tr
                      key={p.id}
                      className="group/row hover-surface transition-colors duration-150"
                    >
                      <td className="p-4">
                        {p.image_url ? (
                          <div className="size-10 rounded-lg overflow-hidden border border-surface">
                            <ProductImage src={p.image_url} />
                          </div>
                        ) : (
                          <div className="size-10 rounded-lg bg-surface flex items-center justify-center">
                            <ImageIcon className="size-4 text-faint" />
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-default max-w-[200px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{p.name}</span>
                          {p.has_variants ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-bold shrink-0">{p.variant_count}v</span> : null}
                          {p.track_batches ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold shrink-0">B</span> : null}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs text-default bg-surface px-2.5 py-1 rounded-lg border border-surface">
                          {p.sku}
                        </span>
                      </td>
                      <td className="p-4">
                        {p.barcode ? (
                          <span className="font-mono text-xs text-muted">
                            {p.barcode}
                          </span>
                        ) : (
                          <span className="text-faint">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {p.category ? (
                          <span className="text-xs text-violet-300 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-faint">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-semibold text-default">
                        {p.unit_price != null ? `$${p.unit_price.toFixed(2)}` : <span className="text-faint">-</span>}
                      </td>
                      <td className="p-4 text-right font-semibold text-default">
                        {p.price_per_case != null ? `$${p.price_per_case.toFixed(2)}` : <span className="text-faint">-</span>}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isLowStock
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-sm shadow-rose-500/5 animate-pulse"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          <T k="products.stockBadge" vars={{ qty: p.quantity, min: p.min_stock }} />
                        </span>
                      </td>
                      <td className="p-4 text-default">{p.supplier_name || <span className="text-faint">-</span>}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
                          <Link
                            href={`/products/${p.id}`}
                            className="p-2 hover:bg-zinc-800/80 rounded-lg text-muted hover:text-default border border-transparent hover:border-zinc-750 transition-all duration-200"
                          >
                            <Edit className="size-4" />
                          </Link>
                          <DeleteProductButton id={p.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
