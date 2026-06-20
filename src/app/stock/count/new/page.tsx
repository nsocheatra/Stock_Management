import { createAudit } from "@/lib/actions";
import { requirePermission } from "@/lib/auth";
import { T } from "@/components/T";

export default async function NewStockCountPage() {
  await requirePermission("audit.manage");
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-lg mx-auto pt-12">
      <div>
        <h1 className="text-2xl font-bold text-default"><T k="audit.new" /></h1>
        <p className="text-sm text-faint mt-1"><T k="audit.newSubtitle" /></p>
      </div>
      <form action={createAudit} className="bg-surface-blur border-surface rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-default mb-1">
            <T k="audit.name" />
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="e.g. Monthly Audit June 2026"
            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-surface text-default placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-violet-500/10"
        >
          <T k="audit.start" />
        </button>
      </form>
    </div>
  );
}
