"use client";

import { Trash2 } from "lucide-react";
import { deleteSupplier } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

export default function DeleteSupplierButton({ id }: { id: number }) {
  const { t } = useTranslation();
  return (
    <form action={deleteSupplier.bind(null, id)}>
      <button
        type="submit"
        className="p-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg text-zinc-450 hover:text-rose-450 transition-all duration-200"
        onClick={(e) => {
          if (!confirm(t("suppliers.deleteConfirm"))) e.preventDefault();
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}

