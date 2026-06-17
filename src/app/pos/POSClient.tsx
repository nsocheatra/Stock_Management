"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Search, ShoppingCart, Scan, Minus, Plus, Trash2, Printer, Users, Building2, Store, Image as ImageIcon, ShoppingBag } from "lucide-react";
import { processPOS, getSettings } from "@/lib/actions";
import ReceiptView from "./ReceiptView";

type Product = { id: number; name: string; sku: string; barcode: string | null; price: number; wholesale_price: number | null; selling_price: number | null; original_price: number | null; unit_price: number | null; price_per_case: number | null; quantity: number; image_url: string | null; category: string | null };
type Customer = { id: number; name: string; customer_type: string };
type CartItem = { product: Product; qty: number; price: number };
type ReceiptItem = { name: string; sku: string; price: number; qty: number };

export default function POSClient({ products, customers }: { products: Product[]; customers: Customer[] }) {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [scanBuf, setScanBuf] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[] | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCart, setShowCart] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const isWholesale = selectedCustomer?.customer_type === "wholesale";

  const effectivePrice = useCallback((product: Product) => {
    if (isWholesale && product.price_per_case != null) return product.price_per_case;
    if (product.selling_price != null) return product.selling_price;
    return product.price;
  }, [isWholesale]);

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode && p.barcode.includes(search))
      )
    : products;

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.quantity) } : item
        );
      }
      const price = effectivePrice(product);
      return [...prev, { product, qty: 1, price }];
    });
    setSearch("");
    searchRef.current?.focus();
  }, [effectivePrice]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const code = scanBuf.trim();
        if (code.length >= 4) {
          const found = products.find((p) => p.barcode === code);
          if (found) addToCart(found);
          scanTimer.current = undefined;
        }
        setScanBuf("");
        return;
      }
      if (e.key.length === 1 && e.target !== searchRef.current &&
          !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        clearTimeout(scanTimer.current);
        const next = scanBuf + e.key;
        setScanBuf(next);
        scanTimer.current = setTimeout(() => setScanBuf(""), 300);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
      }, [scanBuf, products, addToCart]);

  const handleBarcodeDetect = useCallback((code: string) => {
    const found = products.find((p) => p.barcode === code);
    if (found) addToCart(found);
  }, [products, addToCart]);

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, qty: Math.max(1, Math.min(item.qty + delta, item.product.quantity)) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const formData = new FormData();
    formData.set("items", JSON.stringify(cart.map((item) => ({ productId: item.product.id, quantity: item.qty, price: item.price }))));
    if (selectedCustomer) {
      formData.set("customer_id", String(selectedCustomer.id));
      formData.set("customer_type", selectedCustomer.customer_type);
    }
    const result = await processPOS(formData);
    if ("error" in result) {
      setMessage({ text: result.error || t("pos.saleFailed"), ok: false });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    if (result.success) {
      const items = cart.map((item) => ({ name: item.product.name, sku: item.product.sku, price: item.price, qty: item.qty }));
      setCart([]);
      setSelectedCustomer(null);
      setMessage({ text: t("pos.saleSuccess"), ok: true });
      setReceiptItems(items);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="flex h-full relative">
      {receiptItems && settings && (
        <ReceiptView
          items={receiptItems}
          total={total}
          storeName={settings.store_name}
          storeAddress={settings.store_address}
          storePhone={settings.store_phone}
          header={settings.receipt_header}
          footer={settings.receipt_footer}
          onClose={() => setReceiptItems(null)}
        />
      )}

      {/* Products panel */}
      <div className="flex-1 p-3 md:p-6 md:border-r border-surface overflow-auto pb-20 md:pb-6">
        {/* Customer selector */}
        <div className="mb-3 md:mb-4">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
            <select
              value={selectedCustomer?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCustomer(id ? customers.find((c) => c.id === parseInt(id)) ?? null : null);
                setCart([]);
              }}
              className="input-field pl-10 appearance-none text-sm"
            >
              <option value="">{t("pos.walkIn")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.customer_type === "wholesale" ? t("customers.types.wholesaler") : t("customers.types.retailer")}
                </option>
              ))}
            </select>
            {isWholesale && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Building2 className="size-3" />
                {t("pos.wholesale")}
              </div>
            )}
            {selectedCustomer && !isWholesale && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-sky-400">
                <Store className="size-3" />
                {t("pos.retail")}
              </div>
            )}
          </div>
        </div>

        <div className="relative mb-3 md:mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.searchPlaceholder")}
            className="input-field pl-10 pr-10 text-sm"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {scanBuf && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 mr-1">
                <Scan className="size-3" />
                {t("pos.scanning")}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.quantity === 0}
              className={`text-left p-3 md:p-4 rounded-xl border transition-all duration-200 ${
                p.quantity === 0
                  ? "opacity-40 cursor-not-allowed border-surface"
                  : "border-surface hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer"
              }`}
            >
              {p.image_url ? (
                <div className="w-full h-20 md:h-24 rounded-lg overflow-hidden mb-2 border border-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="w-full h-20 md:h-24 rounded-lg mb-2 bg-surface flex items-center justify-center">
                  <ImageIcon className="size-5 md:size-6 text-faint" />
                </div>
              )}
              <p className="font-semibold text-default text-xs md:text-sm truncate">{p.name}</p>
              <p className="text-[10px] md:text-xs text-muted font-mono mt-0.5">{p.sku}</p>
              <div className="flex items-center justify-between mt-1 md:mt-2">
                <span className="text-xs md:text-sm font-bold text-default">${effectivePrice(p).toFixed(2)}</span>
                {isWholesale && p.wholesale_price != null && (
                  <span className="text-[10px] line-through text-faint">${p.price.toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.quantity <= 5 ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {t("pos.itemsLeft", { qty: p.quantity })}
                </span>
              </div>
            </button>
          ))}
          {search && filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted">{t("pos.noMatch")}</div>
          )}
        </div>
      </div>

      {/* Mobile cart button */}
      <button
        onClick={() => setShowCart(true)}
        className="md:hidden fixed bottom-4 right-4 z-40 p-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30 border border-violet-500/30 flex items-center gap-2 cursor-pointer"
      >
        <ShoppingBag className="size-5" />
        {itemCount > 0 && (
          <span className="text-xs font-bold">{itemCount}</span>
        )}
      </button>

      {/* Mobile cart backdrop */}
      {showCart && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setShowCart(false)} />
      )}

      {/* Cart panel */}
      <div className={`
        fixed md:static inset-x-0 bottom-0 z-40
        md:z-auto md:w-80 lg:w-96
        flex flex-col border-surface
        md:border-l
        bg-[var(--bg-main)]
        rounded-t-2xl md:rounded-none
        max-h-[80vh] md:max-h-full
        transition-transform duration-300 ease-in-out
        ${showCart ? "translate-y-0" : "translate-y-full md:translate-y-0"}
      `}>
        <div className="p-3 md:p-4 border-b border-surface flex items-center gap-2 shrink-0">
          <ShoppingCart className="size-4 text-muted" />
          <span className="text-sm font-semibold text-default">{t("pos.cart")}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-muted">{t("pos.items", { count: itemCount })}</span>
          <button onClick={() => setShowCart(false)} className="md:hidden ml-auto p-1 text-muted hover:text-default cursor-pointer">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 md:p-4 space-y-2 md:space-y-3">
          {cart.map((item) => (
            <div key={item.product.id} className="p-2 md:p-3 rounded-xl border border-surface">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-semibold text-default truncate">{item.product.name}</p>
                  <p className="text-[10px] text-faint font-mono">{item.product.sku}</p>
                </div>
                <button onClick={() => removeItem(item.product.id)} className="p-1 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors cursor-pointer">
                  <Trash2 className="size-3" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded hover:bg-surface text-muted transition-colors cursor-pointer">
                    <Minus className="size-3" />
                  </button>
                  <span className="text-xs md:text-sm font-bold text-default w-6 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded hover:bg-surface text-muted transition-colors cursor-pointer">
                    <Plus className="size-3" />
                  </button>
                </div>
                  <span className="text-xs md:text-sm font-bold text-default">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-center py-10 md:py-16 text-faint">
              <ShoppingCart className="size-8 md:size-10 mx-auto mb-3 opacity-40" />
              <p className="text-xs md:text-sm">{t("pos.cartEmpty")}</p>
              <p className="text-[10px] md:text-xs mt-1">{t("pos.cartEmptyHint")}</p>
            </div>
          )}
        </div>

        <div className="p-3 md:p-4 border-t border-surface space-y-2 md:space-y-3 shrink-0">
          {cart.length > 0 && (
            <button
              onClick={() => setReceiptItems(cart.map((item) => ({ name: item.product.name, sku: item.product.sku, price: item.price, qty: item.qty })))}
              className="w-full py-2 rounded-xl text-xs font-medium border border-surface text-muted hover:text-default hover:bg-surface transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="size-3" />
              {t("pos.previewReceipt")}
            </button>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-muted">{t("pos.subtotal", { count: itemCount })}</span>
            <span className="text-sm md:text-lg font-bold text-default">${total.toFixed(2)}</span>
          </div>
          {message && (
            <div className={`text-xs text-center py-2 rounded-lg ${message.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              {message.text}
            </div>
          )}
          <button
            onClick={() => { setShowCart(false); checkout(); }}
            disabled={cart.length === 0}
            className="w-full py-2.5 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer"
          >
            {t("pos.completeSale", { total: total.toFixed(2) })}
          </button>
        </div>
      </div>
    </div>
  );
}
