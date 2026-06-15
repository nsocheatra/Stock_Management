import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AuditCountClient from "./AuditCountClient";
import { T } from "@/components/T";
import { CheckCircle2, Loader2 } from "lucide-react";

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
}

interface AuditInfo {
  id: number;
  name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export default async function AuditDetailPage({ params }: Props) {
  const { id } = await params;
  const auditId = parseInt(id);
  if (isNaN(auditId)) notFound();

  const audit = db.prepare("SELECT id, name, status, created_at, completed_at FROM physical_audits WHERE id = ?").get(auditId) as AuditInfo | undefined;
  if (!audit) notFound();

  const items = db.prepare(`
    SELECT ai.id, p.name as product_name, p.sku, ai.expected_qty, ai.actual_qty, ai.difference, ai.note
    FROM physical_audit_items ai
    JOIN products p ON p.id = ai.product_id
    ORDER BY p.name ASC
  `).all(auditId) as AuditItem[];

  const counted = items.filter(i => i.actual_qty !== null).length;
  const discrepancies = items.filter(i => i.difference !== null && i.difference !== 0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-default">{audit.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              audit.status === "completed"
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "text-amber-400 bg-amber-500/10 border-amber-500/20"
            }`}>
              {audit.status === "completed" ? <CheckCircle2 className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
              <T k={`audit.statuses.${audit.status}`} />
            </span>
          </div>
          <p className="text-sm text-faint mt-1">
            <T k="audit.created" />: {new Date(audit.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="text-right text-sm text-faint">
          <p><T k="audit.counted" />: {counted}/{items.length}</p>
          {discrepancies > 0 && <p className="text-rose-400 font-semibold mt-0.5"><T k="audit.discrepancies" />: {discrepancies}</p>}
        </div>
      </div>

      <AuditCountClient items={items} auditId={audit.id} auditStatus={audit.status} />
    </div>
  );
}
