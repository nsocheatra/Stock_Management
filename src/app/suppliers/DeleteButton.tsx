"use client";

import { Trash2 } from "lucide-react";
import { deleteSupplier } from "@/lib/actions";

export default function DeleteSupplierButton({ id }: { id: number }) {
  return (
    <form action={deleteSupplier.bind(null, id)}>
      <button
        type="submit"
        className="p-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg text-zinc-450 hover:text-rose-450 transition-all duration-200"
        onClick={(e) => {
          if (!confirm("Are you sure you want to delete this supplier? All associated products will be unassigned.")) e.preventDefault();
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}

