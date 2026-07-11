"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import Link from "next/link";
import { Plus, Trash2, Search, Minus } from "lucide-react";
import { createCustomerOrder } from "@/server/actions";
import { useRouter } from "next/navigation";

type Customer = { id: number; name: string; phone: string | null };
type Product = { id: number; name: string; sku: string; price: number; selling_price: number | null; quantity: number };

export default function OrderForm({ customers, products }: { customers: Customer[]; products: Product[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<Array<{ product_id: number; product_name: string; price: number; quantity: number }>>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())) : products;

  const addItem = (product: Product) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems((prev) => prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      const price = product.selling_price || product.price;
      setItems((prev) => [...prev, { product_id: product.id, product_name: product.name, price, quantity: 1 }]);
    }
    setSearch("");
  };

  const updateQty = (productId: number, delta: number) => {
    setItems((prev) => prev.map((i) => i.product_id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <form action={async (fd) => {
      fd.set("items", JSON.stringify(items));
      await createCustomerOrder(fd);
      router.push("/orders");
    }} className="space-y-4">
      <div>
        <label className="input-label">{t("orders.customer")}</label>
        <select name="customer_id" className="input-field appearance-none">
          <option value="">Walk-in Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="input-label">{t("orders.items")}</label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="input-field pl-10" onFocus={() => setAdding(true)} />
        </div>
        {adding && search && (
          <div className="mb-3 max-h-40 overflow-auto rounded-xl border border-surface bg-surface-blur">
            {filtered.map((p) => (
              <button key={p.id} type="button" onClick={() => addItem(p)} disabled={p.quantity === 0} className="w-full text-left px-4 py-2.5 hover:bg-surface text-sm flex items-center justify-between transition-colors cursor-pointer disabled:opacity-40">
                <span className="font-medium text-default">{p.name} <span className="text-faint font-mono">({p.sku})</span></span>
                <span className="text-xs text-faint">${(p.selling_price || p.price).toFixed(2)} · {p.quantity} left</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-3 text-xs text-faint">No products found</p>}
          </div>
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-default truncate">{item.product_name}</p>
                <p className="text-xs text-faint">${item.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateQty(item.product_id, -1)} className="p-1 rounded hover:bg-surface text-muted cursor-pointer"><Minus className="size-3" /></button>
                <span className="text-sm font-bold text-default w-8 text-center">{item.quantity}</span>
                <button type="button" onClick={() => updateQty(item.product_id, 1)} className="p-1 rounded hover:bg-surface text-muted cursor-pointer"><Plus className="size-3" /></button>
              </div>
              <span className="text-sm font-semibold text-default w-20 text-right">${(item.price * item.quantity).toFixed(2)}</span>
              <button type="button" onClick={() => removeItem(item.product_id)} className="p-1 text-muted hover:text-rose-400 cursor-pointer"><Trash2 className="size-3" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-faint text-center py-4">{t("orders.cartEmpty")}</p>}
        </div>
      </div>

      <div>
        <label className="input-label">{t("orders.deliveryAddress")}</label>
        <textarea name="delivery_address" rows={2} className="input-field resize-none" />
      </div>

      <div>
        <label className="input-label">{t("orders.deliveryFee")}</label>
        <input name="delivery_fee" type="number" step="0.01" min="0" defaultValue="0" className="input-field" />
      </div>

      <div>
        <label className="input-label">{t("common.note")}</label>
        <textarea name="note" rows={2} className="input-field resize-none" />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-surface">
        <span className="text-sm text-muted">{t("orders.total")}: <strong className="text-lg text-default">${total.toFixed(2)}</strong></span>
        <div className="flex gap-2">
          <Link href="/orders" className="px-5 py-2.5 rounded-xl font-medium text-sm border border-surface text-muted hover:text-default hover:bg-surface transition-all">{t("common.cancel")}</Link>
          <button type="submit" className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer">{t("common.save")}</button>
        </div>
      </div>
    </form>
  );
}
