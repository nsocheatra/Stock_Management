import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Edit, MapPin } from "lucide-react";
import LocationForm from "../LocationForm";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("stock.manage");
  const { id } = await params;
  const location = await db.prepare("SELECT * FROM locations WHERE id = ?").get(parseInt(id)) as { id: number; name: string; address: string | null; is_default: number } | undefined;
  if (!location) notFound();

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
          <Edit className="size-6 text-amber-400" />
          Edit Location
        </h1>
        <p className="text-sm text-faint mt-1">Update {location.name}</p>
      </div>
      <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl">
        <LocationForm initial={location} />
      </div>
    </div>
  );
}
