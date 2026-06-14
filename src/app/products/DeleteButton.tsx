"use client";

import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/actions";

export default function DeleteProductButton({ id }: { id: number }) {
  return (
    <form action={deleteProduct.bind(null, id)}>
      <button
        type="submit"
        className="p-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg text-zinc-400 hover:text-rose-400 transition-all duration-200"
        onClick={(e) => {
          if (!confirm("Are you sure you want to delete this product?")) e.preventDefault();
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}

