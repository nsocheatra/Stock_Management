"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import {
  Search, ShoppingCart, Scan, Minus, Plus, Trash2,
  Image as ImageIcon, Barcode, Maximize2, Minimize2, User,
  Printer, Percent, BadgePercent, Package, Layers,
  ClipboardPlus, ClipboardCheck, BarChart3, Truck, Gem, Radio
} from "lucide-react";
import { processPOS, getSettings } from "@/lib/actions";
import ReceiptView from "./ReceiptView";

type Product = { id: number; name: string; sku: string; barcode: string | null; price: number; wholesale_price: number | null; selling_price: number | null; original_price: number | null; unit_price: number | null; price_per_case: number | null; quantity: number; image_url: string | null; category: string | null; has_variants: number; track_batches: number };
type Customer = { id: number; name: string; customer_type: string };
type Promotion = { id: number; name: string; type: string; value: number; min_purchase: number; buy_qty: number; get_qty: number; product_id: number | null; start_date: string | null; end_date: string | null; active: number };
type Member = { customer_id: number; tier_id: number; tier_name: string; discount_percent: number };
type VariantInfo = { id: number; product_id: number; name: string; sku: string | null; barcode: string | null; price: number | null; quantity: number };
type BatchInfo = { id: number; product_id: number; variant_id: number | null; batch_no: string; quantity: number; expiry_date: string | null; location_id: number | null };
type LocationInfo = { id: number; name: string; address: string | null };
type CartItem = { product: Product; qty: number; price: number; discount?: number; discountType?: string; promotionId?: number; variantId?: number; variantName?: string; batchId?: number; batchNo?: string; locationId?: number; locationName?: string };
type ReceiptItem = { name: string; sku: string; price: number; qty: number; discount?: number };

const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "credit"];

export default function POSClient({ products, customers, promotions, members, variants, batches, locations }: {
  products: Product[]; customers: Customer[]; promotions: Promotion[]; members: Member[];
  variants: VariantInfo[]; batches: BatchInfo[]; locations: LocationInfo[];
}) {
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
  const [editingQty, setEditingQty] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [continuousScan, setContinuousScan] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Variant/Batch picker state
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerStep, setPickerStep] = useState<"variant" | "batch" | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantInfo | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const variantsByProduct = useMemo(() => {
    const map: Record<number, VariantInfo[]> = {};
    for (const v of variants) {
      if (!map[v.product_id]) map[v.product_id] = [];
      map[v.product_id].push(v);
    }
    return map;
  }, [variants]);

  const batchesByProduct = useMemo(() => {
    const map: Record<number, BatchInfo[]> = {};
    for (const b of batches) {
      if (!map[b.product_id]) map[b.product_id] = [];
      map[b.product_id].push(b);
    }
    return map;
  }, [batches]);

  const batchesByVariant = useMemo(() => {
    const map: Record<number, BatchInfo[]> = {};
    for (const b of batches) {
      if (b.variant_id != null) {
        if (!map[b.variant_id]) map[b.variant_id] = [];
        map[b.variant_id].push(b);
      }
    }
    return map;
  }, [batches]);

  const locationMap = useMemo(() => {
    const map: Record<number, LocationInfo> = {};
    for (const l of locations) map[l.id] = l;
    return map;
  }, [locations]);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const allCategories = categories.length > 0;

  const isWholesale = selectedCustomer?.customer_type === "wholesale";

  const effectivePrice = useCallback((product: Product, variantPrice?: number | null) => {
    if (variantPrice != null) return variantPrice;
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

    if (memberTier && memberTier.discount_percent > 0) {
      const memberDiscount = (unitPrice * qty - maxDiscount) * (memberTier.discount_percent / 100);
      if (memberDiscount > 0) {
        maxDiscount += memberDiscount;
        discountType = discountType ? `${discountType}+member` : "member";
      }
    }

    return { discount: maxDiscount, discountType, promotionId };
  }, [getProductPromotions, memberTier]);

  // ─── Variant/Batch Picker Flow ─────────────────────────────
  const handleProductClick = useCallback((product: Product) => {
    const prodVariants = variantsByProduct[product.id];
    if (prodVariants && prodVariants.length > 0) {
      setPickerProduct(product);
      setPickerStep("variant");
      setSelectedVariant(null);
      setSelectedBatch(null);
      return;
    }
    if (product.track_batches) {
      const prodBatches = batchesByProduct[product.id];
      if (prodBatches && prodBatches.length > 0) {
        setPickerProduct(product);
        setPickerStep("batch");
        setSelectedVariant(null);
        setSelectedBatch(null);
        return;
      }
    }
    addToCartDirect(product, undefined, undefined);
  }, [variantsByProduct, batchesByProduct, effectivePrice, getItemDiscount]);

  const handleVariantSelect = useCallback((variant: VariantInfo) => {
    setSelectedVariant(variant);
    const prodBatches = batchesByVariant[variant.id];
    const product = pickerProduct!;
    if (product.track_batches && prodBatches && prodBatches.length > 0) {
      setPickerStep("batch");
    } else {
      addToCartDirect(product, variant, undefined);
      closePicker();
    }
  }, [batchesByVariant, pickerProduct, effectivePrice, getItemDiscount]);

  const handleBatchSelect = useCallback((batch: BatchInfo) => {
    setSelectedBatch(batch);
    addToCartDirect(pickerProduct!, selectedVariant ?? undefined, batch);
    closePicker();
  }, [pickerProduct, selectedVariant, effectivePrice, getItemDiscount]);

  const closePicker = useCallback(() => {
    setPickerProduct(null);
    setPickerStep(null);
    setSelectedVariant(null);
    setSelectedBatch(null);
  }, []);

  const addToCartDirect = useCallback((product: Product, variant?: VariantInfo, batch?: BatchInfo) => {
    const price = effectivePrice(product, variant?.price);
    const variantId = variant?.id;
    const batchId = batch?.id;
    const locationId = batch?.location_id ?? null;
    const cartKey = `${product.id}-${variantId ?? ""}-${batchId ?? ""}`;

    setCart((prev): CartItem[] => {
      const existing = prev.find((item) => {
        const key = `${item.product.id}-${item.variantId ?? ""}-${item.batchId ?? ""}`;
        return key === cartKey;
      });
      if (existing) {
        const maxQty = batch ? batch.quantity : (variant ? variant.quantity : product.quantity);
        const newQty = Math.min(existing.qty + 1, maxQty);
        const disc = getItemDiscount(product, newQty, price);
        return prev.map((item): CartItem =>
          (item.product.id === product.id && item.variantId === variantId && item.batchId === batchId)
            ? { ...item, qty: newQty, ...disc, price }
            : item
        );
      }
      const disc = getItemDiscount(product, 1, price);
      return [...prev, {
        product, qty: 1, price, ...disc,
        variantId,
        variantName: variant?.name,
        batchId,
        batchNo: batch?.batch_no,
        locationId,
        locationName: locationId && locationMap[locationId] ? locationMap[locationId].name : undefined,
      } as CartItem];
    });
    setSearch("");
    searchRef.current?.focus();
  }, [effectivePrice, getItemDiscount, locationMap]);

  // ─── Barcode Scanner ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && continuousScan) {
        const code = scanBuf.trim();
        if (code.length >= 4) {
          const found = products.find((p) => p.barcode === code);
          if (found) {
            handleProductClick(found);
          } else {
            // Check variant barcodes
            const foundVar = variants.find((v) => v.barcode === code);
            if (foundVar) {
              const prod = products.find((p) => p.id === foundVar.product_id);
              if (prod) {
                if (variantsByProduct[prod.id]?.length === 1) {
                  addToCartDirect(prod, foundVar, undefined);
                } else {
                  handleVariantSelect(foundVar);
                }
              }
            }
          }
          setSearch("");
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
  }, [scanBuf, products, variants, variantsByProduct, addToCartDirect, handleProductClick, handleVariantSelect, continuousScan]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Camera Barcode Scanner ─────────────────────────────────
  const handleDetectedBarcode = useCallback((code: string) => {
    const found = products.find((p) => p.barcode === code);
    if (found) {
      handleProductClick(found);
      stopScanner();
      return true;
    }
    const foundVar = variants.find((v) => v.barcode === code);
    if (foundVar) {
      const prod = products.find((p) => p.id === foundVar.product_id);
      if (prod) {
        if (variantsByProduct[prod.id]?.length === 1) {
          addToCartDirect(prod, foundVar, undefined);
        } else {
          handleVariantSelect(foundVar);
        }
        stopScanner();
        return true;
      }
    }
    return false;
  }, [products, variants, variantsByProduct, handleProductClick, handleVariantSelect, addToCartDirect]);

  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((t) => t.stop());
      scannerStreamRef.current = null;
    }
    setShowScanner(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!("BarcodeDetector" in window)) {
      alert("Camera barcode scanning requires Chrome or Edge on desktop/Android. Use a USB barcode scanner instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      scannerStreamRef.current = stream;
      setShowScanner(true);

      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            resolve();
          };
        }
      });

      const detector = new (window as any).BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "codabar", "itf", "qr_code", "data_matrix", "pdf417", "aztec"] });
      scanningRef.current = true;

      const scan = async () => {
        if (!scanningRef.current || !videoRef.current || !scannerCanvasRef.current) return;
        if (videoRef.current.readyState < 2) { requestAnimationFrame(scan); return; }

        const canvas = scannerCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) { requestAnimationFrame(scan); return; }

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        try {
          const codes = await detector.detect(canvas);
          if (codes.length > 0) {
            const rawValue = codes[0].rawValue;
            if (rawValue && scanningRef.current) {
              handleDetectedBarcode(rawValue);
              return;
            }
          }
        } catch { /* detection frame error */ }

        if (scanningRef.current) requestAnimationFrame(scan);
      };

      scan();
    } catch {
      alert("Could not access camera. Ensure camera permissions are granted.");
    }
  }, [handleDetectedBarcode]);

  useEffect(() => {
    if (editingQty !== null && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [editingQty]);

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

  const updateQty = (productId: number, variantId?: number, batchId?: number, delta?: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId || item.variantId !== variantId || item.batchId !== batchId) return item;
        const maxQty = batchId
          ? (batches.find((b) => b.id === batchId)?.quantity ?? item.product.quantity)
          : (variantId
            ? (variants.find((v) => v.id === variantId)?.quantity ?? item.product.quantity)
            : item.product.quantity);
        const newQty = Math.max(1, Math.min((item.qty + (delta ?? 0)), maxQty));
        const disc = getItemDiscount(item.product, newQty, item.price);
        return { ...item, qty: newQty, ...disc };
      }).filter((item) => item.qty > 0)
    );
  };

  const setItemQty = (productId: number, variantId?: number, batchId?: number, qty?: number) => {
    if (qty == null) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const maxQty = batchId
      ? (batches.find((b) => b.id === batchId)?.quantity ?? product.quantity)
      : (variantId
        ? (variants.find((v) => v.id === variantId)?.quantity ?? product.quantity)
        : product.quantity);
    const clamped = Math.max(1, Math.min(qty, maxQty));
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId || item.variantId !== variantId || item.batchId !== batchId) return item;
        const disc = getItemDiscount(item.product, clamped, item.price);
        return { ...item, qty: clamped, ...disc };
      }).filter((item) => item.qty > 0)
    );
  };

  const startEditQty = (cartKey: string, currentQty: number) => {
    setEditingQty(cartKey);
    setQtyInput(String(currentQty));
  };

  const commitEditQty = (cartKey: string) => {
    const val = parseInt(qtyInput, 10);
    if (!isNaN(val) && val > 0) {
      const [pid, vid, bid] = cartKey.split("-");
      setItemQty(parseInt(pid), vid ? parseInt(vid) : undefined, bid ? parseInt(bid) : undefined, val);
    }
    setEditingQty(null);
    setQtyInput("");
  };

  const removeItem = (productId: number, variantId?: number, batchId?: number) => {
    setCart((prev) => prev.filter((item) =>
      !(item.product.id === productId && item.variantId === variantId && item.batchId === batchId)
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartItemKey = (item: CartItem) => `${item.product.id}-${item.variantId ?? ""}-${item.batchId ?? ""}`;

  const previewReceipt = () => {
    const items = cart.map((item) => ({
      name: item.product.name + (item.variantName ? ` (${item.variantName})` : ""),
      sku: item.product.sku,
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
      variantId: item.variantId, batchId: item.batchId, locationId: item.locationId,
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
        name: item.product.name + (item.variantName ? ` (${item.variantName})` : ""),
        sku: item.product.sku,
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

  const getStockLabel = (product: Product) => {
    const prodVariants = variantsByProduct[product.id];
    const prodBatches = batchesByProduct[product.id];
    if (prodVariants && prodVariants.length > 0) {
      const totalStock = prodVariants.reduce((s, v) => s + v.quantity, 0);
      return { qty: totalStock, label: `${totalStock} (${prodVariants.length}v)` };
    }
    if (prodBatches && prodBatches.length > 0) {
      const totalBatchStock = prodBatches.reduce((s, b) => s + b.quantity, 0);
      return { qty: totalBatchStock, label: `${totalBatchStock} (${prodBatches.length}b)` };
    }
    return { qty: product.quantity, label: String(product.quantity) };
  };

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

      {/* Variant/Batch Picker Modal */}
      {pickerProduct && pickerStep && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={closePicker}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827]">
                {pickerProduct.name}
                {pickerStep === "variant" ? " — Select Variant" : " — Select Batch"}
              </h3>
              <button onClick={closePicker} className="text-[#6B7280] hover:text-[#111827] cursor-pointer text-lg leading-none">&times;</button>
            </div>

            {pickerStep === "variant" && (variantsByProduct[pickerProduct.id] || []).map((v) => {
              const vBatches = batchesByVariant[v.id] || [];
              const batchStock = vBatches.reduce((s, b) => s + b.quantity, 0);
              const displayStock = vBatches.length > 0 ? batchStock : v.quantity;
              return (
                <button key={v.id} onClick={() => handleVariantSelect(v)}
                  disabled={displayStock === 0}
                  className={`w-full text-left p-4 rounded-xl mb-2 border transition-all duration-150 flex items-center justify-between ${
                    displayStock === 0
                      ? "opacity-40 cursor-not-allowed border-[#E5E7EB]"
                      : "border-[#E5E7EB] bg-white hover:border-[#9CA3AF] hover:bg-[var(--bg-main)] cursor-pointer"
                  }`}>
                  <div>
                    <p className="font-semibold text-sm text-[#111827]">{v.name}</p>
                    {v.sku && <p className="text-xs text-[#6B7280] font-mono mt-0.5">{v.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#111827]">${effectivePrice(pickerProduct, v.price).toFixed(2)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      displayStock <= 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      {displayStock} left
                    </span>
                  </div>
                </button>
              );
            })}

            {pickerStep === "batch" && (selectedVariant ? batchesByVariant[selectedVariant.id] : batchesByProduct[pickerProduct.id] || []).map((b) => (
              <button key={b.id} onClick={() => handleBatchSelect(b)}
                disabled={b.quantity === 0}
                className={`w-full text-left p-4 rounded-xl mb-2 border transition-all duration-150 flex items-center justify-between ${
                  b.quantity === 0
                    ? "opacity-40 cursor-not-allowed border-[#E5E7EB]"
                    : "border-[#E5E7EB] bg-white hover:border-[#9CA3AF] hover:bg-[var(--bg-main)] cursor-pointer"
                }`}>
                <div className="flex items-center gap-3">
                  <Layers className="size-5 text-[#6B7280]" />
                  <div>
                    <p className="font-semibold text-sm text-[#111827]">{b.batch_no}</p>
                    <p className="text-xs text-[#6B7280]">
                      {b.expiry_date ? `Exp: ${b.expiry_date}` : "No expiry"}
                      {b.location_id && locationMap[b.location_id] ? ` • ${locationMap[b.location_id].name}` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  b.quantity <= 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                }`}>
                  {b.quantity} left
                </span>
              </button>
            ))}

            {pickerStep === "variant" && (!variantsByProduct[pickerProduct.id] || variantsByProduct[pickerProduct.id].length === 0) && (
              <p className="text-sm text-[#6B7280] text-center py-4">No variants available</p>
            )}
            {pickerStep === "batch" && (!batchesByProduct[pickerProduct.id] || batchesByProduct[pickerProduct.id].length === 0) && (
              <p className="text-sm text-[#6B7280] text-center py-4">No batches available</p>
            )}
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70" onClick={stopScanner}>
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mx-4 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto max-h-[70vh] object-contain bg-black" />
            <canvas ref={scannerCanvasRef} className="hidden" />
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Scan className="size-4 animate-pulse" />
                Scanning...
              </span>
              <button onClick={stopScanner} className="text-white/80 hover:text-white cursor-pointer text-lg leading-none bg-black/30 rounded-full size-8 flex items-center justify-center">&times;</button>
            </div>
            <div className="absolute inset-x-[15%] top-1/3 bottom-1/3 border-2 border-white/40 rounded-xl pointer-events-none" />
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/50">Point camera at a barcode</p>
          </div>
        </div>
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
          <button onClick={startScanner}
            className="flex items-center justify-center size-9 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer"
            title="Scan with Camera">
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
                const stock = getStockLabel(p);
                const prodVariants = variantsByProduct[p.id];
                const prodBatches = batchesByProduct[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    disabled={stock.qty === 0}
                    className={`text-left p-3 rounded-xl border transition-all duration-150 relative ${
                      stock.qty === 0
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
                        stock.qty <= 5 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {stock.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {prodVariants && prodVariants.length > 0 && (
                        <span className="text-[9px] font-medium text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Package className="size-2.5" />
                          {prodVariants.length}v
                        </span>
                      )}
                      {p.track_batches && prodBatches && prodBatches.length > 0 && (
                        <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Layers className="size-2.5" />
                          B
                        </span>
                      )}
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
              cart.map((item) => {
                const key = cartItemKey(item);
                return (
                  <div key={key} className="p-3 rounded-xl border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-[#111827] truncate">
                            {item.product.name}
                            {item.variantName ? <span className="text-[#6B7280] font-normal"> ({item.variantName})</span> : ""}
                          </p>
                          {item.discount && item.discount > 0 ? (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded shrink-0">%</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#6B7280] font-mono">{item.product.sku}</p>
                        {item.batchNo && (
                          <p className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                            <Layers className="size-3" />
                            {item.batchNo}
                            {item.locationName ? ` • ${item.locationName}` : ""}
                          </p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.product.id, item.variantId, item.batchId)}
                        className="p-1 rounded text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors duration-150 cursor-pointer">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.product.id, item.variantId, item.batchId, -1)}
                          className="flex items-center justify-center size-7 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all duration-150 cursor-pointer">
                          <Minus className="size-3.5" />
                        </button>
                        {String(editingQty) === key ? (
                          <input ref={qtyInputRef} type="number" min={1}
                            value={qtyInput} onChange={(e) => setQtyInput(e.target.value)}
                            onBlur={() => commitEditQty(key)}
                            onKeyDown={(e) => { if (e.key === "Enter") commitEditQty(key); if (e.key === "Escape") setEditingQty(null); }}
                            className="w-14 h-7 text-center text-sm font-bold text-[#111827] border border-[#9CA3AF] rounded-lg outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : (
                          <button onClick={() => startEditQty(key, item.qty)}
                            className="text-sm font-bold text-[#111827] w-8 text-center cursor-text hover:bg-[var(--bg-main)] rounded transition-colors duration-150 py-1">
                            {item.qty}
                          </button>
                        )}
                        <button onClick={() => updateQty(item.product.id, item.variantId, item.batchId, 1)}
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
                );
              })
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

      <div className="fixed bottom-4 left-4 z-50 flex flex-wrap gap-1.5">
        <button onClick={() => router.push("/")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          Dashboard
        </button>
        <button onClick={() => router.push("/stock/purchase")} title="Purchase"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <ClipboardPlus className="size-3.5" />
          Purchase
        </button>
        <button onClick={() => router.push("/stock")} title="Stock"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <ClipboardCheck className="size-3.5" />
          Stock
        </button>
        <button onClick={() => router.push("/reports")} title="Reports"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <BarChart3 className="size-3.5" />
          Reports
        </button>
        <button onClick={() => router.push("/delivery")} title="Delivery"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <Truck className="size-3.5" />
          Delivery
        </button>
        <button onClick={() => router.push("/promotions")} title="Promotions"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <Percent className="size-3.5" />
          Promo
        </button>
        <button onClick={() => router.push("/membership")} title="Membership"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <Gem className="size-3.5" />
          Member
        </button>
        <button onClick={() => router.push("/livestream")} title="Livestream"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[var(--bg-main)] transition-all cursor-pointer shadow-sm">
          <Radio className="size-3.5" />
          Livestream
        </button>
      </div>
    </div>
  );
}
