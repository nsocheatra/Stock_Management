"use client";

import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/lib/actions";

export default function DeleteCustomerButton({ id }: { id: number }) {
  return (
    <form
      action={async () => {
        if (confirm("Delete this customer?")) {
          await deleteCustomer(id);
        }
      }}
    >
      <button
        type="submit"
        className="p-2 hover:bg-rose-500/10 rounded-lg text-muted hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
