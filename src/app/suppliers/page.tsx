import { T } from "@/components/T";
import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Edit, Truck, Mail, Phone, MapPin } from "lucide-react";
import DeleteSupplierButton from "./DeleteButton";

interface SupplierRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  product_count: number;
}

export default function SuppliersPage() {
  const suppliers = db.prepare(`
    SELECT s.id, s.name, s.email, s.phone, s.address, COUNT(p.id) as product_count
    FROM suppliers s
    LEFT JOIN products p ON p.supplier_id = s.id
    GROUP BY s.id
    ORDER BY s.name ASC
  `).all() as SupplierRow[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="suppliers.title" />
          </h1>
          <p className="text-sm text-faint mt-1"><T k="suppliers.subtitle" /></p>
        </div>
        <Link
          href="/suppliers/new"
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4.5 py-2.5 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all duration-200 shadow-lg shadow-violet-500/10 border border-violet-500/20"
        >
          <Plus className="size-4" />
          <span className="text-sm font-semibold"><T k="suppliers.add" /></span>
        </Link>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-20 bg-surface border-surface rounded-2xl">
          <Truck className="size-14 mx-auto mb-4 text-muted opacity-70" />
          <p className="text-lg text-default font-medium"><T k="suppliers.empty" /></p>
          <p className="text-sm text-faint mt-1"><T k="suppliers.emptyHint" /></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-surface-blur border-surface p-6 rounded-2xl relative overflow-hidden group hover:border-violet-500/40 hover:bg-zinc-900/5 transition-all duration-300 shadow-lg flex flex-col justify-between"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-violet-500 to-indigo-500" />
              
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-default tracking-tight group-hover:text-violet-500 transition-colors duration-250 truncate">
                    {s.name}
                  </h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                    <Link
                      href={`/suppliers/${s.id}`}
                      className="p-1.5 hover:bg-zinc-800/20 rounded-lg text-muted hover:text-default border border-transparent hover:border-zinc-750 transition-all duration-200"
                    >
                      <Edit className="size-3.5" />
                    </Link>
                    <DeleteSupplierButton id={s.id} />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1 text-sm text-muted">
                  {s.email ? (
                    <div className="flex items-center gap-2.5 truncate">
                      <Mail className="size-4 text-faint group-hover:text-violet-500 transition-colors duration-300 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  ) : null}
                  {s.phone ? (
                    <div className="flex items-center gap-2.5 truncate">
                      <Phone className="size-4 text-faint group-hover:text-violet-500 transition-colors duration-300 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  ) : null}
                  {s.address ? (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="size-4 text-faint group-hover:text-violet-500 transition-colors duration-300 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{s.address}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-surface flex justify-between items-center">
                <span className="text-xs text-faint font-medium uppercase tracking-wider"><T k="suppliers.indexedCatalog" /></span>
                <span className="text-xs text-violet-300 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20 font-bold">
                  <T k="suppliers.products" vars={{ count: s.product_count }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
