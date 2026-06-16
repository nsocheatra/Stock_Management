import { db } from "@/lib/db";
import { T } from "@/components/T";
import Link from "next/link";
import { Plus } from "lucide-react";
import DebtsClient from "./DebtsClient";

interface DebtRow {
  id: number;
  type: string;
  reference_id: number;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  note: string | null;
  created_at: string;
  name: string;
  phone: string | null;
}

export default async function DebtsPage() {
  const debts = await db.prepare(`
    SELECT d.*,
      CASE WHEN d.type = 'customer' THEN c.name WHEN d.type = 'supplier' THEN s.name END as name,
      CASE WHEN d.type = 'customer' THEN c.phone WHEN d.type = 'supplier' THEN s.phone END as phone
    FROM debts d
    LEFT JOIN customers c ON d.type = 'customer' AND d.reference_id = c.id
    LEFT JOIN suppliers s ON d.type = 'supplier' AND d.reference_id = s.id
    ORDER BY d.created_at DESC
  `).all() as DebtRow[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="debts.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="debts.subtitle" /></p>
        </div>
        <div className="flex gap-2">
          <Link href="/debts/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20">
            <Plus className="size-4" />
            <T k="debts.add" />
          </Link>
        </div>
      </div>
      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <DebtsClient debts={debts} />
      </div>
    </div>
  );
}
