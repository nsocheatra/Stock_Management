import { db } from "@/server/db";
import { T } from "@/components/T";
import { createPromotion } from "@/server/actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewPromotionPage() {
  const products = await db.prepare("SELECT id, name, sku, price FROM products ORDER BY name ASC").all() as any[];

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/promotions" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="promotions.new" />
          </h1>
        </div>
      </div>

      <form action={createPromotion} className="bg-surface-blur border-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <label className="input-label"><T k="common.name" /></label>
          <input name="name" required className="input-field" placeholder="Summer Sale 2024" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label"><T k="promotions.type" /></label>
            <select name="type" required className="input-field appearance-none">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
              <option value="buy_x_get_y">Buy X Get Y</option>
            </select>
          </div>
          <div>
            <label className="input-label"><T k="promotions.value" /></label>
            <input name="value" type="number" step="0.01" min="0" required className="input-field" placeholder="10" />
          </div>
        </div>

        <div>
          <label className="input-label"><T k="promotions.minPurchase" /></label>
          <input name="min_purchase" type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label"><T k="promotions.startDate" /></label>
            <input name="start_date" type="date" className="input-field" />
          </div>
          <div>
            <label className="input-label"><T k="promotions.endDate" /></label>
            <input name="end_date" type="date" className="input-field" />
          </div>
        </div>

        <div>
          <label className="input-label"><T k="promotions.product" /></label>
          <select name="product_id" className="input-field appearance-none">
            <option value="">-- All products --</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4" id="bogo-fields">
          <div>
            <label className="input-label"><T k="promotions.buyQty" /></label>
            <input name="buy_qty" type="number" min="0" className="input-field" placeholder="2" />
          </div>
          <div>
            <label className="input-label"><T k="promotions.getQty" /></label>
            <input name="get_qty" type="number" min="0" className="input-field" placeholder="1" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/promotions" className="flex-1 py-3 rounded-xl font-medium text-sm border border-surface text-muted hover:text-default hover:bg-surface transition-all text-center"><T k="common.cancel" /></Link>
          <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer"><T k="common.save" /></button>
        </div>
      </form>
    </div>
  );
}
