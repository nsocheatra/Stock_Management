import { db } from "@/lib/db";
import Link from "next/link";
import { Hash, MessageCircle, Package, Settings } from "lucide-react";
import FBLiveClient from "./FBLiveClient";
import FBCommentSimulator from "./FBCommentSimulator";
import OrderActions from "./OrderActions";

interface KeywordRow {
  id: number;
  keyword: string;
  product_id: number;
  quantity: number;
  product_name: string;
  sku: string;
}

interface OrderRow {
  id: number;
  customer_name: string;
  comment_text: string;
  keyword: string | null;
  product_id: number | null;
  quantity: number;
  status: string;
  comment_deleted: number;
  created_at: string;
  product_name: string | null;
}

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  quantity: number;
}

export default function FBLivePage() {
  const keywords = db.prepare(`
    SELECT f.id, f.keyword, f.product_id, f.quantity, p.name as product_name, p.sku
    FROM fb_keywords f
    JOIN products p ON p.id = f.product_id
    ORDER BY f.created_at DESC
  `).all() as KeywordRow[];

  const orders = db.prepare(`
    SELECT o.id, o.customer_name, o.comment_text, o.keyword, o.product_id, o.quantity, o.status, o.comment_deleted, o.created_at, p.name as product_name
    FROM fb_orders o
    LEFT JOIN products p ON p.id = o.product_id
    ORDER BY o.created_at DESC
    LIMIT 50
  `).all() as OrderRow[];

  const products = db.prepare("SELECT id, name, sku, quantity FROM products ORDER BY name ASC").all() as ProductRow[];

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const fbEnabled = (db.prepare("SELECT value FROM fb_settings WHERE key = 'listening_enabled'").get() as { value: string } | undefined)?.value === "1";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            Facebook Live Auto-Ordering
          </h1>
          <p className="text-sm text-faint mt-1">Link keywords to products and auto-process orders from live comments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/fb-live/settings"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface text-muted hover:text-default hover:bg-surface transition-all duration-200"
          >
            <Settings className="size-4" />
            <span className="text-sm font-semibold">Settings</span>
          </Link>
          <div className="flex items-center gap-2 bg-surface-blur border-surface rounded-xl px-4 py-2.5">
            <span className={`size-2 rounded-full ${fbEnabled ? "bg-emerald-400 shadow-lg shadow-emerald-500/50 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-sm font-semibold text-default">Live</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pendingOrders > 0 ? "bg-emerald-500/15 text-emerald-400" : "text-muted bg-surface"}`}>
              {pendingOrders} pending
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulate Comment + Keyword Setup */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-default flex items-center gap-2 mb-3">
              <MessageCircle className="size-4 text-muted" />
              Simulate Comment
            </h2>
            <p className="text-xs text-faint mb-3">Test your keyword setup by simulating a Facebook comment.</p>
            <FBCommentSimulator keywords={keywords.map(k => k.keyword)} />
          </div>

          <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-default flex items-center gap-2 mb-4">
              <Hash className="size-4 text-muted" />
              Link Keyword to Product
            </h2>
            <FBLiveClient products={products} keywords={keywords} />
          </div>
        </div>

        <div className="lg:col-span-2" />
      </div>

      {/* Orders Feed */}
      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-surface flex items-center justify-between">
          <h2 className="text-sm font-semibold text-default flex items-center gap-2">
            <MessageCircle className="size-4 text-muted" />
            Order Feed
          </h2>
          <span className="text-xs text-faint">{orders.length} orders</span>
        </div>

            {orders.length > 0 ? (
              <div className="overflow-x-auto max-h-[600px] overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0" style={{ backgroundColor: "var(--bg-header)" }}>
                    <tr className="border-b border-surface">
                      <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider w-10">No</th>
                      <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">Name</th>
                      <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">Comment</th>
                      <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider">Time</th>
                      <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-right">Action</th>
                      <th className="p-3 font-semibold text-muted text-xs uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface">
                    {orders.map((o, i) => (
                      <tr key={o.id} className="group/row hover-surface transition-colors">
                        <td className="p-3 text-xs text-faint">{i + 1}</td>
                        <td className="p-3">
                          <span className="text-sm font-semibold text-default">{o.customer_name}</span>
                        </td>
                        <td className="p-3 max-w-[280px]">
                          <p className="text-sm text-muted truncate">&ldquo;{o.comment_text}&rdquo;</p>
                          {o.product_name && (
                            <span className="text-[10px] text-faint flex items-center gap-1 mt-0.5">
                              <Package className="size-3" />
                              {o.product_name} x{o.quantity}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-faint whitespace-nowrap">
                          {new Date(o.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <OrderActions orderId={o.id} />
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {o.comment_deleted ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
                                Deleted
                              </span>
                            ) : (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                o.status === "pending" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"
                              }`}>{o.status === "pending" ? "New" : "Old"}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-faint">
                <MessageCircle className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No orders yet</p>
                <p className="text-xs mt-1">Link keywords and simulate comments to test</p>
              </div>
            )}
        </div>
    </div>
  );
}
