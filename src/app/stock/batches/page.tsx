import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Layers, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import StockTabs from "@/components/StockTabs";
import DeleteBatchButton from "./DeleteButton";

interface BatchRow {
  id: number;
  product_id: number;
  batch_no: string;
  quantity: number;
  expiry_date: string | null;
  location_id: number | null;
  location_name: string | null;
  product_name: string;
  product_sku: string;
  variant_name: string | null;
  cost_price: number | null;
  received_date: string;
}

export default async function BatchesPage() {
  await requirePermission("stock.manage");
  const batches = await db.prepare(`
    SELECT b.*, p.name as product_name, p.sku as product_sku, pv.name as variant_name,
           l.name as location_name
    FROM batches b
    JOIN products p ON p.id = b.product_id
    LEFT JOIN product_variants pv ON pv.id = b.variant_id
    LEFT JOIN locations l ON l.id = b.location_id
    ORDER BY b.created_at DESC
  `).all() as BatchRow[];

  const today = new Date().toISOString().slice(0, 10);
  const expiredCount = batches.filter(b => b.expiry_date && b.expiry_date < today && b.quantity > 0).length;
  const nearExpiryCount = batches.filter(b => {
    if (!b.expiry_date || b.quantity <= 0) return false;
    const daysLeft = (new Date(b.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 30;
  }).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="size-6 text-cyan-400" />
            Batches
          </h1>
          <p className="text-sm text-faint mt-1">Track stock batches, expiry dates, and lot numbers</p>
        </div>
        <Link href="/stock/batches/new" className="px-4 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/15 flex items-center gap-2">
          <Plus className="size-4" />
          New Batch
        </Link>
      </div>

      <StockTabs />

      {/* Alert cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="size-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-300">{expiredCount} Expired Batches</p>
            <p className="text-xs text-muted">Stock with past expiry dates</p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="size-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">{nearExpiryCount} Near Expiry</p>
            <p className="text-xs text-muted">Expiring within 30 days</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        {batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface text-xs text-faint uppercase tracking-wider">
                  <th className="text-left p-3 font-semibold">Batch #</th>
                  <th className="text-left p-3 font-semibold">Product</th>
                  <th className="text-left p-3 font-semibold">Variant</th>
                  <th className="text-left p-3 font-semibold">Location</th>
                  <th className="text-right p-3 font-semibold">Qty</th>
                  <th className="text-right p-3 font-semibold">Cost</th>
                  <th className="text-right p-3 font-semibold">Expiry</th>
                  <th className="text-right p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {batches.map((b) => {
                  const isExpired = b.expiry_date && b.expiry_date < today;
                  const nearExpiry = b.expiry_date && !isExpired && (new Date(b.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24) <= 30;
                  return (
                    <tr key={b.id} className="hover-surface transition-colors">
                      <td className="p-3 font-mono text-xs font-semibold text-default">{b.batch_no}</td>
                      <td className="p-3">
                        <span className="text-default font-medium">{b.product_name}</span>
                        <span className="text-faint text-[10px] block">{b.product_sku}</span>
                      </td>
                      <td className="p-3 text-muted">{b.variant_name || "—"}</td>
                      <td className="p-3 text-muted">{b.location_name || "—"}</td>
                      <td className="p-3 text-right font-semibold">{b.quantity}</td>
                      <td className="p-3 text-right text-muted">{b.cost_price ? `$${b.cost_price.toFixed(2)}` : "—"}</td>
                      <td className="p-3 text-right">
                        {b.expiry_date ? (
                          <span className={`inline-flex items-center gap-1 ${isExpired ? "text-rose-400" : nearExpiry ? "text-amber-400" : "text-emerald-400"}`}>
                            {isExpired ? <AlertTriangle className="size-3" /> : nearExpiry ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
                            {b.expiry_date}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <DeleteBatchButton id={b.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-faint">
            <Layers className="size-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No batches recorded</p>
            <Link href="/stock/batches/new" className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-block">Create your first batch</Link>
          </div>
        )}
      </div>
    </div>
  );
}
