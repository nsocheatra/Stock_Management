"use client";

import { useActionState, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createProduct, updateProduct } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

type Supplier = { id: number; name: string };
type Product = {
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
  minStock: number;
  supplierId: number | null;
  barcode: string | null;
  image_url: string | null;
};

function generateSku(name: string): string {
  const letter = name.replace(/[^a-zA-Z]/g, "").slice(0, 1).toUpperCase();
  if (!letter) return "";
  const num = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `${letter}${num}`;
}

export default function ProductForm({
  suppliers,
  product,
}: {
  suppliers: Supplier[];
  product?: Product;
}) {
  const isUpdate = !!product;
  const { t } = useTranslation();
  const [sku, setSku] = useState(product?.sku ?? "");
  const [skuEdited, setSkuEdited] = useState(!!product?.sku);
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [imageError, setImageError] = useState(false);
  const barcodeBuf = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const code = barcodeBuf.current.trim();
        if (code.length >= 4) {
          setBarcode(code);
          barcodeBuf.current = "";
        }
        return;
      }
      if (e.key.length === 1) {
        barcodeBuf.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuf.current = ""; }, 200);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!skuEdited && !isUpdate) {
      const generated = generateSku(e.target.value);
      if (generated) setSku(generated);
    }
  }, [skuEdited, isUpdate]);

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    if (isUpdate && product) {
      await updateProduct(product.id, formData);
    } else {
      await createProduct(formData);
    }
  };

  const [, formAction] = useActionState(wrappedAction, null);


  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
            <label className="input-label">{t("products.fields.name")}</label>
          <input
            name="name"
            defaultValue={product?.name}
            required
            onChange={handleNameChange}
            placeholder={t("products.placeholders.name")}
            className="input-field"
          />
        </div>
        <div>
            <label className="input-label">{t("products.fields.sku")}</label>
          <input
            name="sku"
            value={sku}
            required
            onChange={(e) => { setSku(e.target.value); setSkuEdited(true); }}
            placeholder={t("products.placeholders.sku")}
            className="input-field font-mono"
          />
        </div>
        <div>
            <label className="input-label">{t("products.fields.barcode")}</label>
          <input
            name="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={t("products.placeholders.barcode")}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="input-label">{t("products.fields.unitPrice")}</label>
          <input
            name="unit_price"
            type="number"
            step="0.01"
            defaultValue={product?.unit_price ?? ""}
            placeholder={t("products.placeholders.price")}
            className="input-field"
          />
        </div>
        <div>
            <label className="input-label">{t("products.fields.pricePerCase")}</label>
          <input
            name="price_per_case"
            type="number"
            step="0.01"
            defaultValue={product?.price_per_case ?? ""}
            placeholder={t("products.placeholders.price")}
            className="input-field"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="input-label">{t("products.fields.price")}</label>
          <input
            name="price"
            type="number"
            step="0.01"
            defaultValue={product?.price}
            required
            placeholder={t("products.placeholders.price")}
            className="input-field"
          />
        </div>
        <div>
            <label className="input-label">{t("products.fields.quantity")}</label>
          <input
            name="quantity"
            type="number"
            defaultValue={product?.quantity ?? 0}
            placeholder="0"
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="input-label">{t("products.fields.category")}</label>
          <input
            name="category"
            defaultValue={product?.category ?? ""}
            placeholder={t("products.placeholders.category")}
            className="input-field"
          />
        </div>
        <div>
            <label className="input-label">{t("products.fields.minStock")}</label>
          <input
            name="minStock"
            type="number"
            defaultValue={product?.minStock ?? 5}
            placeholder={t("products.placeholders.minStock")}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="input-label">{t("products.fields.description")}</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={product?.description ?? ""}
            placeholder={t("products.placeholders.description")}
            className="input-field resize-none"
          />
        </div>
        <div>
            <label className="input-label">{t("products.fields.imageUrl")}</label>
          <input
            name="image_url"
            type="url"
            value={imageUrl}
            onChange={(e) => { setImageUrl(e.target.value); setImageError(false); }}
            placeholder={t("products.placeholders.imageUrl")}
            className="input-field"
          />
          {imageUrl && !imageError && (
            <div className="mt-2 rounded-lg overflow-hidden border border-surface w-24 h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}
          {imageError && imageUrl && (
            <div className="mt-2 text-[10px] text-rose-400">{t("products.imageError")}</div>
          )}
        </div>
      </div>

      <div>
        <label className="input-label">{t("products.fields.supplier")}</label>
        <select
          name="supplierId"
          defaultValue={product?.supplierId ?? ""}
          className="input-field"
        >
          <option value="" className="select-option">{t("products.noSupplier")}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id} className="select-option">
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer text-sm"
        >
          {isUpdate ? t("products.edit") : t("products.new")}
        </button>
        <Link
          href="/products"
          className="cancel-btn"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
