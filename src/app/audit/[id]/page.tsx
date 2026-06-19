import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cancelAudit } from "@/lib/actions";
import AuditCountClient from "./AuditCountClient";
import { T } from "@/components/T";
import { CheckCircle2, Loader2, XCircle, ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

interface AuditItem {
  id: number;
  product_name: string;
  sku: string;
  expected_qty: number;
  actual_qty: number | null;
  difference: number | null;
  note: string | null;
  variant_id: number | null;
  variant_name: string | null;
  variant_sku: string | null;
  batch_id: number | null;
  batch_no: string | null;
  expiry_date: string | null;
  location_name: string | null;
  has_variants: number;
  track_batches: number;
}

interface AuditInfo {
  id: number;
  name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export default async function AuditDetailPage({ params }: Props) {
  await requirePermission("audit.manage");
  const { id } = await params;
  const auditId = parseInt(id);
  if (isNaN(auditId)) notFound();

  const audit = await db.prepare("SELECT id, name, status, created_at, completed_at FROM physical_audits WHERE id = ?").get(auditId) as AuditInfo | undefined;
  if (!audit) notFound();

  const items = await db.prepare(`
    SELECT ai.id, ai.product_id, ai.variant_id, ai.batch_id, ai.expected_qty, ai.actual_qty, ai.difference, ai.note,
      p.name as product_name, p.sku, p.has_variants, p.track_batches,
      pv.name as variant_name, pv.sku as variant_sku,
      b.batch_no, b.expiry_date,
      l.name as location_name
    FROM physical_audit_items ai
    JOIN products p ON p.id = ai.product_id
    LEFT JOIN product_variants pv ON pv.id = ai.variant_id
    LEFT JOIN batches b ON b.id = ai.batch_id
    LEFT JOIN locations l ON l.id = b.location_id
    WHERE ai.audit_id = ?
    ORDER BY ai.id ASC
  `).all(auditId) as AuditItem[];

  const counted = items.filter(i => i.actual_qty !== null).length;
  const discrepancies = items.filter(i => i.difference !== null && i.difference !== 0).length;

  const statusColors: Record<string, string> = {
    in_progress: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    cancelled: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/audit" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-default transition-colors mb-2">
        <ArrowLeft className="size-3.5" />
        Back to Stock Counts
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-default">{audit.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[audit.status] || ""}`}>
              {audit.status === "completed" ? <CheckCircle2 className="size-3" /> : audit.status === "cancelled" ? <XCircle className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
              <T k={`audit.statuses.${audit.status}`} />
            </span>
          </div>
          <p className="text-sm text-faint mt-1">
            <T k="audit.created" />: {new Date(audit.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {audit.completed_at && <> &middot; Completed: {new Date(audit.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </div>
        <div className="text-right text-sm text-faint">
          <p><T k="audit.counted" />: {counted}/{items.length}</p>
          {discrepancies > 0 && <p className="text-rose-400 font-semibold mt-0.5"><T k="audit.discrepancies" />: {discrepancies}</p>}
        </div>
      </div>

      {audit.status === "in_progress" && (
        <form action={cancelAudit}>
          <input type="hidden" name="audit_id" value={audit.id} />
          <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
            onClick={(e) => { if (!confirm("Cancel this stock count?")) e.preventDefault(); }}>
            Cancel Count
          </button>
        </form>
      )}

      <AuditCountClient items={items} auditId={audit.id} auditStatus={audit.status} />
    </div>
  );
}
