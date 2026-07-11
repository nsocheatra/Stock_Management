import { requirePermission } from "@/server/auth";
import { MapPin } from "lucide-react";
import LocationForm from "../LocationForm";

export default async function NewLocationPage() {
  await requirePermission("stock.manage");
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
          <MapPin className="size-6 text-amber-400" />
          Add Location
        </h1>
        <p className="text-sm text-faint mt-1">Create a new stock location or warehouse</p>
      </div>
      <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl">
        <LocationForm />
      </div>
    </div>
  );
}
