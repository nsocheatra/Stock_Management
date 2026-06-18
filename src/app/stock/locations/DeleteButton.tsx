"use client";

import { useActionState } from "react";
import { deleteLocation } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteLocationButton({ id }: { id: number }) {
  const router = useRouter();
  const [, formAction] = useActionState(
    async () => {
      await deleteLocation(id);
      router.refresh();
    },
    null
  );

  return (
    <form action={formAction} onSubmit={(e) => { if (!confirm("Delete this location?")) e.preventDefault(); }}>
      <button type="submit" className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
