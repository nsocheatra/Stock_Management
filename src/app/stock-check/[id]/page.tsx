import { db } from "@/lib/db";
import { T } from "@/components/T";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createStockCheck } from "@/lib/actions";
import StockCheckDetail from "../StockCheckClient";

export default async function StockCheckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checkId = parseInt(id);
  const check = db.prepare("SELECT * FROM stock_checks WHERE id = ?").get(checkId) as any;
  if (!check) return <div className="p-8 text-center text-faint"><T k="stockCheck.notFound" /></div>;

  const items = db.prepare(`
    SELECT sci.*, p.name, p.sku FROM stock_check_items sci
    JOIN products p ON p.id = sci.product_id
    WHERE sci.stock_check_id = ?
    ORDER BY p.name ASC
  `).all(checkId) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/stock-check" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            {check.name}
          </h1>
          <p className="text-xs text-faint mt-1">
            <T k="stockCheck.status" />: <T k={`stockCheck.statuses.${check.status}`} /> · {check.created_at?.slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        <StockCheckDetail checkId={checkId} items={items} />
      </div>
    </div>
  );
}
