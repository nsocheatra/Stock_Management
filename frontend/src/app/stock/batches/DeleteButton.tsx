"use client";

import { useActionState } from "react";
import { deleteBatch } from "@/server/actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteBatchButton({ id }: { id: number }) {
  const router = useRouter();
  const [, formAction] = useActionState(
    async () => {
      await deleteBatch(id);
      router.refresh();
    },
    null
  );

  return (
    <form action={formAction} onSubmit={(e) => { if (!confirm("Delete this batch?")) e.preventDefault(); }}>
      <button type="submit" className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
        <Trash2 className="size-3.5" />
      </button>
    </form>
  );
}
