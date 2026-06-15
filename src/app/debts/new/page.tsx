import { db } from "@/lib/db";
import { T } from "@/components/T";
import { createDebt } from "@/lib/actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewDebtPage() {
  const customers = db.prepare("SELECT id, name, phone FROM customers ORDER BY name ASC").all() as any[];
  const suppliers = db.prepare("SELECT id, name, phone FROM suppliers ORDER BY name ASC").all() as any[];

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/debts" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="debts.add" />
          </h1>
        </div>
      </div>

      <form action={createDebt} className="bg-surface-blur border-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <label className="input-label"><T k="debts.type" /></label>
          <select name="type" id="debt-type" required className="input-field appearance-none">
            <option value="customer"><T k="debts.types.customer" /></option>
            <option value="supplier"><T k="debts.types.supplier" /></option>
          </select>
        </div>

        <div>
          <label className="input-label"><T k="debts.party" /></label>
          <select name="reference_id" id="party-select" required className="input-field appearance-none">
            <optgroup label="Customers">
              {customers.map((c: any) => (
                <option key={`c-${c.id}`} value={c.id} data-type="customer">{c.name} {c.phone ? `(${c.phone})` : ""}</option>
              ))}
            </optgroup>
            <optgroup label="Suppliers">
              {suppliers.map((s: any) => (
                <option key={`s-${s.id}`} value={s.id} data-type="supplier">{s.name} {s.phone ? `(${s.phone})` : ""}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="input-label"><T k="debts.amount" /></label>
          <input name="amount" type="number" step="0.01" min="0.01" required className="input-field" placeholder="0.00" />
        </div>

        <div>
          <label className="input-label"><T k="common.date" /></label>
          <input name="due_date" type="date" className="input-field" />
        </div>

        <div>
          <label className="input-label"><T k="common.note" /></label>
          <textarea name="note" rows={3} className="input-field resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/debts" className="flex-1 py-3 rounded-xl font-medium text-sm border border-surface text-muted hover:text-default hover:bg-surface transition-all text-center"><T k="common.cancel" /></Link>
          <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer"><T k="common.save" /></button>
        </div>
      </form>
    </div>
  );
}
