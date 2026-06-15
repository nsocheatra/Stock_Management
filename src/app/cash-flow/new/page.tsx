import { T } from "@/components/T";
import { createCashFlowEntry } from "@/lib/actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCashFlowPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/cash-flow" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="cashFlow.add" />
          </h1>
        </div>
      </div>

      <form action={createCashFlowEntry} className="bg-surface-blur border-surface rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <label className="input-label"><T k="cashFlow.type" /></label>
          <select name="type" required className="input-field appearance-none">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div>
          <label className="input-label"><T k="cashFlow.category" /></label>
          <select name="category" required className="input-field appearance-none">
            <option value="Sales">Sales</option>
            <option value="Purchase">Purchase</option>
            <option value="Salary">Salary</option>
            <option value="Rent">Rent</option>
            <option value="Utility">Utility</option>
            <option value="Transport">Transport</option>
            <option value="Marketing">Marketing</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="input-label"><T k="cashFlow.amount" /></label>
          <input name="amount" type="number" step="0.01" min="0.01" required className="input-field" placeholder="0.00" />
        </div>

        <div>
          <label className="input-label"><T k="cashFlow.description" /></label>
          <textarea name="description" rows={3} className="input-field resize-none" placeholder="Optional description" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/cash-flow" className="flex-1 py-3 rounded-xl font-medium text-sm border border-surface text-muted hover:text-default hover:bg-surface transition-all text-center"><T k="common.cancel" /></Link>
          <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 cursor-pointer"><T k="common.save" /></button>
        </div>
      </form>
    </div>
  );
}
