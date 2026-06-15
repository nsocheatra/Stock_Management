"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Package } from "lucide-react";
import { addFBKeyword, deleteFBKeyword } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

type Product = { id: number; name: string; sku: string; quantity: number };
type Keyword = { id: number; keyword: string; product_id: number; quantity: number; product_name: string; sku: string };

export default function FBLiveClient({ products, keywords }: { products: Product[]; keywords: Keyword[] }) {
  const [keyword, setKeyword] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const { t } = useTranslation();

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !productId) return;
    const fd = new FormData();
    fd.set("keyword", keyword.trim());
    fd.set("productId", productId);
    fd.set("quantity", qty.toString());
    const result = await addFBKeyword(fd);
    if (result.success) {
      setKeyword("");
      setProductId("");
      setQty(1);
      router.refresh();
    }
  };

  const handleDeleteKeyword = async (id: number) => {
    await deleteFBKeyword(id);
    router.refresh();
  };

  return (
    <div>
      <form onSubmit={handleAddKeyword} className="space-y-3">
        <div>
          <label className="input-label">{t("fbLive.main.fields.keyword")}</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("fbLive.main.keywordPlaceholder")}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="input-label">{t("fbLive.main.fields.product")}</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input-field" required>
            <option value="" className="select-option">{t("fbLive.main.productPlaceholder")}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} className="select-option" disabled={p.quantity === 0}>
                {t("fbLive.main.productOption", { name: p.name, sku: p.sku, qty: p.quantity })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">{t("fbLive.main.fields.qtyPerOrder")}</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 1)}
            className="input-field"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer"
        >
          {t("fbLive.main.addKeyword")}
        </button>
      </form>

      {keywords.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-faint font-medium uppercase tracking-wider">{t("fbLive.main.activeKeywords")}</p>
          {keywords.map((k) => (
            <div key={k.id} className="flex items-center justify-between p-2.5 rounded-xl border border-surface hover-surface transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-default truncate">#{k.keyword}</p>
                <p className="text-xs text-muted truncate flex items-center gap-1">
                  <Package className="size-3" />
                  {k.product_name} &times; {k.quantity}
                </p>
              </div>
              <button
                onClick={() => handleDeleteKeyword(k.id)}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


