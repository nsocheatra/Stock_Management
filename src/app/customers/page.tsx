import { T } from "@/components/T";
import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Edit, Users, Building2, Store } from "lucide-react";
import DeleteCustomerButton from "./DeleteButton";

interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string;
  credit: number;
  created_at: string;
}

export default async function CustomersPage() {
  const customers = await db.prepare("SELECT * FROM customers ORDER BY name ASC").all() as CustomerRow[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="customers.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="customers.subtitle" /></p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4.5 py-2.5 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-violet-500/10 border border-violet-500/20"
        >
          <Plus className="size-4" />
          <span className="text-sm font-semibold"><T k="customers.add" /></span>
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 bg-surface border-surface rounded-2xl">
          <Users className="size-14 mx-auto mb-4 text-muted opacity-70" />
          <p className="text-lg text-default font-medium"><T k="customers.empty" /></p>
          <p className="text-sm text-faint mt-1 mb-4"><T k="customers.emptyHint" /></p>
          <Link
            href="/customers/new"
            className="text-violet-400 hover:text-violet-300 font-semibold text-sm hover:underline"
          >
            <T k="customers.emptyCta" />
          </Link>
        </div>
      ) : (
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface bg-header">
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="customers.table.name" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="customers.table.type" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="customers.table.phone" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="customers.table.address" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider"><T k="customers.table.credit" /></th>
                  <th className="p-4 font-semibold text-muted text-xs uppercase tracking-wider text-right"><T k="common.actions" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {customers.map((c) => (
                  <tr key={c.id} className="group/row hover-surface transition-colors duration-150">
                    <td className="p-4 font-semibold text-default">{c.name}</td>
                    <td className="p-4">
                      {c.customer_type === "wholesale" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <Building2 className="size-3" />
                          <T k="customers.types.wholesaler" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                          <Store className="size-3" />
                          <T k="customers.types.retailer" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-muted">{c.phone || <span className="text-faint">-</span>}</td>
                    <td className="p-4 text-muted max-w-[200px] truncate">{c.address || <span className="text-faint">-</span>}</td>
                    <td className="p-4 text-default font-semibold">${c.credit.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
                        <Link
                          href={`/customers/${c.id}`}
                          className="p-2 hover:bg-zinc-800/80 rounded-lg text-muted hover:text-default border border-transparent hover:border-zinc-750 transition-all duration-200"
                        >
                          <Edit className="size-4" />
                        </Link>
                        <DeleteCustomerButton id={c.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
