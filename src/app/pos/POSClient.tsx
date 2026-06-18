"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import {
  Search, ShoppingCart, Scan, Minus, Plus, Trash2,
  Image as ImageIcon, Barcode, Maximize2, Minimize2, User,
  Printer, Percent, BadgePercent
} from "lucide-react";
import { processPOS, getSettings } from "@/lib/actions";
import ReceiptView from "./ReceiptView";

type Product = { id: number; name: string; sku: string; barcode: string | null; price: number; wholesale_price: number | null; selling_price: number | null; original_price: number | null; unit_price: number | null; price_per_case: number | null; quantity: number; image_url: string | null; category: string | null };
type Customer = { id: number; name: string; customer_type: string };
type Promotion = { id: number; name: string; type: string; value: number; min_purchase: number; buy_qty: number; get_qty: number; product_id: number | null; start_date: string | null; end_date: string | null; active: number };
type Member = { customer_id: number; tier_id: number; tier_name: string; discount_percent: number };
type CartItem = { product: Product; qty: number; price: number; discount?: number; discountType?: string; promotionId?: number };
type ReceiptItem = { name: string; sku: string; price: number; qty: number; discount?: number };

const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "credit"];

export default function POSClient({ products, customers, promotions, members }: { products: Product[]; customers: Customer[]; promotions: Promotion[]; members: Member[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [scanBuf, setScanBuf] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[] | null>(null);
  const [receiptDiscount, setReceiptDiscount] = useState(0);
  const [receiptPayment, setReceiptPayment] = useState("");
  const [saleTotal, setSaleTotal] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number | null>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [continuousScan, setContinuousScan] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const allCategories = categories.length > 0;

  const isWholesale = selectedCustomer?.customer_type === "wholesale";

  const effectivePrice = useCallback((product: Product) => {
    if (isWholesale && product.price_per_case != null) return product.price_per_case;
    if (product.selling_price != null) return product.selling_price;
    return product.price;
  }, [isWholesale]);

  // ─── Promotion Engine ──────────────────────────────────────
  const memberTier = useMemo(() => {
    if (!selectedCustomer) return null;
    return members.find(m => m.customer_id === selectedCustomer.id) || null;
  }, [selectedCustomer, members]);

  const activePromotions = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return promotions.filter(p =>
      p.active &&
      (!p.start_date || p.start_date <= now) &&
      (!p.end_date || p.end_date >= now)
    );
  }, [promotions]);

  const getProductPromotions = useCallback((productId: number) => {
    return activePromotions.filter(p => !p.product_id || p.product_id === productId);
  }, [activePromotions]);

  const getItemDiscount = useCallback((product: Product, qty: number, unitPrice: number) => {
    const applicablePromos = getProductPromotions(product.id);
    let maxDiscount = 0;
    let discountType = "";
    let promotionId: number | undefined;

    for (const promo of applicablePromos) {
      const lineTotal = unitPrice * qty;
      if (promo.min_purchase > 0 && lineTotal < promo.min_purchase) continue;

      if (promo.type === "percentage") {
        const d = lineTotal * (promo.value / 100);
        if (d > maxDiscount) { maxDiscount = d; discountType = "percentage"; promotionId = promo.id; }
      } else if (promo.type === "fixed") {
        if (promo.value > maxDiscount) { maxDiscount = promo.value; discountType = "fixed"; promotionId = promo.id; }
      } else if (promo.type === "buy_x_get_y" && promo.buy_qty > 0) {
        const freeQty = Math.floor(qty / (promo.buy_qty + promo.get_qty)) * promo.get_qty;
        if (freeQty > 0) {
          const d = (unitPrice / (promo.buy_qty + promo.get_qty)) * promo.get_qty * qty;
          if (d > maxDiscount) { maxDiscount = d; discountType = "buy_x_get_y"; promotionId = promo.id; }
        }
      }
    }

    // Membership discount (applied on top)
    if (memberTier && memberTier.discount_percent > 0) {
      const memberDiscount = (unitPrice * qty - maxDiscount) * (memberTier.discount_percent / 100);
      if (memberDiscount > 0) {
        maxDiscount += memberDiscount;
        discountType = discountType ? `${discountType}+member` : "member";
      }
    }

    return { discount: maxDiscount, discountType, promotionId };
  }, [getProductPromotions, memberTier]);

  // ─── Cart Operations ───────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const price = effectivePrice(product);
      if (existing) {
        const newQty = Math.min(existing.qty + 1, product.quantity);
        const disc = getItemDiscount(product, newQty, price);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: newQty, ...disc, price }
            : item
        );
      }
      const disc = getItemDiscount(product, 1, price);
      return [...prev, { product, qty: 1, price, ...disc }];
    });
    setSearch("");
    searchRef.current?.focus();
  }, [effectivePrice, getItemDiscount]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && continuousScan) {
        const code = scanBuf.trim();
        if (code.length >= 4) {
          const found = products.find((p) => p.barcode === code);
          if (found) {
            addToCart(found);
            setSearch("");
          }
          scanTimer.current = undefined;
        }
        setScanBuf("");
        return;
      }
      if (continuousScan && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        clearTimeout(scanTimer.current);
        const next = scanBuf + e.key;
        setScanBuf(next);
        scanTimer.current = setTimeout(() => setScanBuf(""), 300);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scanBuf, products, addToCart, continuousScan]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (editingQty !== null && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [editingQty]);

  // Refresh discounts when cart changes (e.g., customer change affects membership)
  useEffect(() => {
    setCart((prev) => prev.map((item) => {
      const disc = getItemDiscount(item.product, item.qty, item.price);
      return { ...item, ...disc };
    }));
  }, [selectedCustomer, getItemDiscount]);

  const filtered = (search || activeCategory ? products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.sku.toLowerCase().includes(search.toLowerCase()) &&
        !(p.barcode && p.barcode.includes(search))) return false;
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  }) : products);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  const tax = Math.max(0, (subtotal - discountAmount) * 0.1);
  const total = Math.max(0, subtotal - discountAmount + tax);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const newQty = Math.max(1, Math.min(item.qty + delta, item.product.quantity));
        const disc = getItemDiscount(item.product, newQty, item.price);
        return { ...item, qty: newQty, ...disc };
      }).filter((item) => item.qty > 0)
    );
  };

  const setItemQty = (productId: number, qty: number) => {
    const clamped = Math.max(1, Math.min(qty, products.find((p) => p.id === productId)?.quantity ?? 99));
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const disc = getItemDiscount(item.product, clamped, item.price);
        return { ...item, qty: clamped, ...disc };
      }).filter((item) => item.qty > 0)
    );
  };

  const startEditQty = (productId: number, currentQty: number) => {
    setEditingQty(productId);
    setQtyInput(String(currentQty));
  };

  const commitEditQty = (productId: number) => {
    const val = parseInt(qtyInput, 10);
    if (!isNaN(val) && val > 0) {
      setItemQty(productId, val);
    }
    setEditingQty(null);
    setQtyInput("");
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const previewReceipt = () => {
    const items = cart.map((item) => ({
      name: item.product.name, sku: item.product.sku,
      price: item.price, qty: item.qty,
      discount: item.discount,
    }));
    setReceiptItems(items);
    setReceiptDiscount(discountAmount);
    setReceiptPayment(paymentMethod);
    setSaleTotal(total);
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const formData = new FormData();
    formData.set("items", JSON.stringify(cart.map((item) => ({
      productId: item.product.id, quantity: item.qty, price: item.price,
      discount: item.discount, discountType: item.discountType, promotionId: item.promotionId,
    }))));
    formData.set("payment_method", paymentMethod);
    formData.set("discount_total", String(discountAmount));
    formData.set("discount_type", cart.some(i => i.discountType?.includes("member")) ? "member" : "promotion");
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
      const items = cart.map((item) => ({
        name: item.product.name, sku: item.product.sku,
        price: item.price, qty: item.qty, discount: item.discount,
      }));
      setCart([]);
      setSelectedCustomer(null);
      setMessage({ text: t("pos.saleSuccess"), ok: true });
      setReceiptItems(items);
      setReceiptDiscount(discountAmount);
      setReceiptPayment(paymentMethod);
      setSaleTotal(total);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
      router.push("/");
    }
  };

  const showScanIndicator = scanBuf.length > 0;

  return (
    <div className="h-screen bg-[var(--bg-main)] p-4 flex flex-col overflow-hidden">
      {receiptItems && settings && (
        <ReceiptView
          items={receiptItems}
          total={saleTotal}
          discount={receiptDiscount}
          paymentMethod={receiptPayment}
          customerName={selectedCustomer?.name}
          storeName={settings.store_name}
          storeAddress={settings.store_address}
          storePhone={settings.store_phone}
          header={settings.receipt_header}
          footer={settings.receipt_footer}
          onClose={() => setReceiptItems(null)}
        />
      )}

      {/* Top Control Bar */}
      <div className="bg-white rounded-xl h-16 flex items-center px-4 gap-2 shrink-0 shadow-sm">
        {/* Customer Dropdown */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6B7280] pointer-events-none" />
          <select
            value={selectedCustomer?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedCustomer(id ? customers.find((c) => c.id === parseInt(id)) ?? null : null);
              setCart([]);
            }}
            className="pl-9 pr-8 h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] appearance-none cursor-pointer outline-none transition-all duration-150 focus:border-[#9CA3AF]"
            style={{ minWidth: 180 }}
          >
            <option value="">{t("pos.walkIn")}</option>
            {customers.map((c) => {
              const m = members.find(mem => mem.customer_id === c.id);
              return (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.customer_type === "wholesale" ? t("pos.wholesale") : t("pos.retail")}{m ? ` (${m.tier_name})` : ""}
                </option>
              );
            })}
          </select>
          {memberTier && (
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">
              {memberTier.discount_percent}% off
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6B7280] pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.searchPlaceholder")}
            className="w-full h-10 pl-9 pr-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#9CA3AF]"
            autoFocus
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {showScanIndicator && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Scan className="size-3 animate-pulse" />
                {t("pos.scanning")}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setContinuousScan(!continuousScan)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer ${
              continuousScan
                ? "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[var(--bg-main)]"
                : "border-[#E5E7EB] bg-white text-[#9CA3AF] hover:text-[#6B7280]"
            }`}
          >
            <Scan className="size-4" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button className="flex items-center justify-center size-9 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer">
            <Barcode className="size-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center size-9 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden mt-4 min-h-0">
        {/* Left Panel: Product Catalog */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Category Filter */}
          {allCategories && (
            <div className="flex items-center gap-1.5 pb-3 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  activeCategory === null
                    ? "bg-white text-[#111827] border border-[#E5E7EB] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-white/60 border border-transparent"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    activeCategory === cat
                      ? "bg-white text-[#111827] border border-[#E5E7EB] shadow-sm"
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-white/60 border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p) => {
                const promos = getProductPromotions(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.quantity === 0}
                    className={`text-left p-3 rounded-xl border transition-all duration-150 relative ${
                      p.quantity === 0
                        ? "opacity-40 cursor-not-allowed border-[#E5E7EB]"
                        : "border-[#E5E7EB] bg-white hover:border-[#9CA3AF] cursor-pointer"
                    }`}
                  >
                    {promos.length > 0 && (
                      <span className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-200">
                        <Percent className="size-2.5" />
                        SALE
                      </span>
                    )}
                    {p.image_url ? (
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-[var(--bg-main)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-lg mb-2 bg-[var(--bg-main)] flex items-center justify-center">
                        <ImageIcon className="size-6 text-[#9CA3AF]" />
                      </div>
                    )}
                    <p className="font-semibold text-[#111827] text-sm truncate">{p.name}</p>
                    <p className="text-xs text-[#6B7280] font-mono mt-0.5 truncate">{p.sku}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-[#111827]">${effectivePrice(p).toFixed(2)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.quantity <= 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {t("pos.itemsLeft", { qty: p.quantity })}
                      </span>
                    </div>
                    {promos.length > 0 && (
                      <p className="text-[9px] text-violet-500 mt-1 truncate font-medium">
                        {promos.map(pr => pr.name).join(", ")}
                      </p>
                    )}
                  </button>
                );
              })}
              {search && filtered.length === 0 && (
                <div className="col-span-full text-center py-16 text-[#6B7280] text-sm">
                  {t("pos.noMatch")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Cart Sidebar */}
        <div className="w-[380px] xl:w-[420px] shrink-0 bg-white rounded-2xl flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          {/* Cart Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-[#6B7280]" />
              <h2 className="text-base font-bold text-[#111827]">Cart</h2>
              {itemCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[#6B7280] font-medium">
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-[#6B7280] hover:text-[#111827] transition-colors duration-150 cursor-pointer">
                Clear
              </button>
            )}
          </div>

          {/* Cart Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <ShoppingCart className="size-10 text-[#9CA3AF] mb-3" strokeWidth={1.5} />
                <p className="text-sm text-[#6B7280] font-medium">{t("pos.cartEmpty")}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">{t("pos.cartEmptyHint")}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="p-3 rounded-xl border border-[#E5E7EB]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-[#111827] truncate">{item.product.name}</p>
                        {item.discount && item.discount > 0 ? (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded shrink-0">%</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[#6B7280] font-mono">{item.product.sku}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)}
                      className="p-1 rounded text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors duration-150 cursor-pointer">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.product.id, -1)}
                        className="flex items-center justify-center size-7 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer">
                        <Minus className="size-3.5" />
                      </button>
                      {editingQty === item.product.id ? (
                        <input ref={qtyInputRef} type="number" min={1} max={item.product.quantity}
                          value={qtyInput} onChange={(e) => setQtyInput(e.target.value)}
                          onBlur={() => commitEditQty(item.product.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEditQty(item.product.id); if (e.key === "Escape") setEditingQty(null); }}
                          className="w-14 h-7 text-center text-sm font-bold text-[#111827] border border-[#9CA3AF] rounded-lg outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <button onClick={() => startEditQty(item.product.id, item.qty)}
                          className="text-sm font-bold text-[#111827] w-8 text-center cursor-text hover:bg-[var(--bg-main)] rounded transition-colors duration-150 py-1">
                          {item.qty}
                        </button>
                      )}
                      <button onClick={() => updateQty(item.product.id, 1)}
                        className="flex items-center justify-center size-7 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#111827]">${(item.price * item.qty).toFixed(2)}</span>
                      {item.discount && item.discount > 0 && (
                        <p className="text-[10px] text-emerald-600 font-medium">-${item.discount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="shrink-0 border-t border-[#E5E7EB] px-5 py-4 space-y-3">
            {/* Payment Method */}
            {cart.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280] font-medium w-20">Payment</span>
                <div className="flex gap-1 flex-1">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-150 cursor-pointer ${
                        paymentMethod === m
                          ? "bg-[#111827] text-white border-[#111827]"
                          : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]"
                      }`}>
                      {m === "cash" ? "Cash" : m === "card" ? "Card" : m === "bank_transfer" ? "Bank" : "Credit"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <button onClick={previewReceipt}
                className="w-full py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer">
                <Printer className="size-3.5" />
                {t("pos.previewReceipt")}
              </button>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Subtotal</span>
                <span className="text-[#6B7280]">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <BadgePercent className="size-3.5" />
                    Discount
                  </span>
                  <span className="text-emerald-600 font-medium">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Tax (10%)</span>
                <span className="text-[#6B7280]">${tax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-base pt-1 border-t border-[#E5E7EB]">
                <span className="font-extrabold text-[#111827]">Total</span>
                <span className="font-extrabold text-[#111827]">${total.toFixed(2)}</span>
              </div>
            </div>

            {message && (
              <div className={`text-xs text-center py-2.5 rounded-lg ${
                message.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}>
                {message.text}
              </div>
            )}

            <button onClick={checkout} disabled={cart.length === 0}
              className="w-full h-[52px] rounded-xl text-sm font-bold text-white transition-all duration-150 disabled:bg-[#9CA3AF] disabled:cursor-not-allowed disabled:shadow-none bg-[#111827] hover:bg-black cursor-pointer">
              {t("pos.completeSale", { total: total.toFixed(2) })}
            </button>
          </div>
        </div>
      </div>

      <button onClick={() => router.push("/")}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer shadow-sm">
        Dashboard
      </button>
    </div>
  );
}
