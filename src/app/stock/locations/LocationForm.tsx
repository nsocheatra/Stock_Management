"use client";

import { useActionState } from "react";
import { createLocation } from "@/lib/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LocationForm({ initial }: { initial?: { id: number; name: string; address: string | null; is_default: number } }) {
  const router = useRouter();
  const [, formAction] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      if (initial) {
        const { updateLocation } = await import("@/lib/actions");
        await updateLocation(initial.id, formData);
      } else {
        await createLocation(formData);
      }
      router.refresh();
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="input-label">Name</label>
        <input name="name" required defaultValue={initial?.name} className="input-field" placeholder="e.g. Main Warehouse" />
      </div>
      <div>
        <label className="input-label">Address</label>
        <input name="address" defaultValue={initial?.address || ""} className="input-field" placeholder="e.g. 123 Main Street" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-default">
        <input name="is_default" type="checkbox" value="1" defaultChecked={!!initial?.is_default} className="accent-amber-500 size-4" />
        Set as default location
      </label>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-orange-500 text-white hover:from-amber-500 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/15 cursor-pointer">
          {initial ? "Update" : "Create"}
        </button>
        <Link href="/stock/locations" className="cancel-btn">Cancel</Link>
      </div>
    </form>
  );
}
