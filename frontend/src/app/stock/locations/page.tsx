import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { MapPin, Plus, Edit } from "lucide-react";
import Link from "next/link";
import StockTabs from "@/components/StockTabs";
import DeleteLocationButton from "./DeleteButton";

interface LocationRow {
  id: number;
  name: string;
  address: string | null;
  is_default: number;
  created_at: string;
}

export default async function LocationsPage() {
  await requirePermission("stock.manage");
  const locations = await db.prepare("SELECT * FROM locations ORDER BY is_default DESC, name ASC").all() as LocationRow[];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
            <MapPin className="size-6 text-amber-400" />
            Locations
          </h1>
          <p className="text-sm text-faint mt-1">Manage stock locations and warehouses</p>
        </div>
        <Link href="/stock/locations/new" className="px-4 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-orange-500 text-white hover:from-amber-500 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/15 flex items-center gap-2">
          <Plus className="size-4" />
          Add Location
        </Link>
      </div>

      <StockTabs />

      <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden">
        {locations.length > 0 ? (
          <div className="divide-y divide-surface">
            {locations.map((l) => (
              <div key={l.id} className="p-4 flex items-center justify-between gap-3 hover-surface transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-default truncate">{l.name}</span>
                      {l.is_default ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-bold">Default</span>
                      ) : null}
                    </div>
                    {l.address && <p className="text-xs text-muted truncate">{l.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/stock/locations/${l.id}`} className="p-2 rounded-lg hover-surface text-muted hover:text-default transition-colors">
                    <Edit className="size-4" />
                  </Link>
                  {!l.is_default && <DeleteLocationButton id={l.id} />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-faint">
            <MapPin className="size-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No locations yet</p>
            <Link href="/stock/locations/new" className="text-xs text-amber-400 hover:text-amber-300 mt-2 inline-block">Add your first location</Link>
          </div>
        )}
      </div>
    </div>
  );
}
