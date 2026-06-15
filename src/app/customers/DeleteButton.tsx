"use client";

import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

export default function DeleteCustomerButton({ id }: { id: number }) {
  const { t } = useTranslation();
  return (
    <form
      action={async () => {
        if (confirm(t("customers.deleteConfirm"))) {
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
