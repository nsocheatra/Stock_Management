import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { ArrowDownUp } from "lucide-react";
import StockTabs from "@/components/StockTabs";

interface MovementRow {
  id: number;
  product_id: number;
  type: string;
  quantity: number;
  unit_cost: number | null;
  note: string | null;
  created_at: string;
  product_name: string;
  product_sku: string;
  location_name: string | null;
  batch_no: string | null;
  variant_name: string | null;
}

export default async function MovementsPage() {
  await requirePermission("stock.manage");
  const movements = await db.prepare(`
    SELECT m.*, p.name as product_name, p.sku as product_sku,
           l.name as location_name, b.batch_no, pv.name as variant_name
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    LEFT JOIN locations l ON l.id = m.location_id
    LEFT JOIN batches b ON b.id = m.batch_id
    LEFT JOIN product_variants pv ON pv.id = m.variant_id
    ORDER BY m.created_at DESC
    LIMIT 200
  `).all() as MovementRow[];

  const totalIn = movements.filter(m => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
  const totalOut = movements.filter(m => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <ArrowDownUp className="size-6 text-violet-400" />
            Stock Movements
          </h1>
          <p className="text-sm text-faint mt-1">Full history of stock IN and OUT movements</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-400 font-semibold">IN: +{totalIn}</span>
          <span className="text-rose-400 font-semibold">OUT: -{totalOut}</span>
        </div>
      </div>

      <StockTabs />

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        {movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface text-xs text-faint uppercase tracking-wider">
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">Qty</th>
                  <th className="p-3 font-semibold">Location</th>
                  <th className="p-3 font-semibold">Batch</th>
                  <th className="p-3 font-semibold">Variant</th>
                  <th className="p-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {movements.map((m) => (
                  <tr key={m.id} className="hover-surface transition-colors">
                    <td className="p-3 text-xs text-muted whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        m.type === "IN" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>{m.type}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-default font-medium">{m.product_name}</span>
                      <span className="text-faint text-[10px] block font-mono">{m.product_sku}</span>
                    </td>
                    <td className="p-3 font-semibold">{m.type === "IN" ? "+" : "-"}{m.quantity}</td>
                    <td className="p-3 text-muted">{m.location_name || "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted">{m.batch_no || "—"}</td>
                    <td className="p-3 text-muted">{m.variant_name || "—"}</td>
                    <td className="p-3 text-muted text-xs max-w-[200px] truncate">{m.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-faint">
            <ArrowDownUp className="size-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No movements recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
