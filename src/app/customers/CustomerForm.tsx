"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCustomer } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  customer_type: string;
  credit: number;
};

export default function CustomerForm({ customer }: { customer?: Customer }) {
  const isUpdate = !!customer;
  const { t } = useTranslation();

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    if (isUpdate && customer) {
      formData.set("id", String(customer.id));
    }
    return await saveCustomer(formData);
  };

  const [state, formAction] = useActionState(wrappedAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state && "error" in state && (
        <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="input-label">{t("customers.fields.name")}</label>
          <input
            name="name"
            defaultValue={customer?.name}
            required
            placeholder={t("customers.placeholders.name")}
            className="input-field"
          />
        </div>
        <div>
            <label className="input-label">{t("customers.fields.type")}</label>
          <select
            name="customer_type"
            defaultValue={customer?.customer_type || "retail"}
            className="input-field"
          >
            <option value="retail">{t("customers.types.retailer")}</option>
            <option value="wholesale">{t("customers.types.wholesaler")}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="input-label">{t("customers.fields.phone")}</label>
          <input
            name="phone"
            type="tel"
            defaultValue={customer?.phone ?? ""}
            placeholder={t("customers.placeholders.phone")}
            className="input-field"
          />
        </div>
        <div>
            <label className="input-label">{t("customers.fields.address")}</label>
          <input
            name="address"
            defaultValue={customer?.address ?? ""}
            placeholder={t("customers.placeholders.address")}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="input-label">{t("customers.fields.credit")}</label>
        <input
          name="credit"
          type="number"
          step="0.01"
          defaultValue={customer?.credit ?? 0}
          className="input-field"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer text-sm"
        >
          {isUpdate ? t("customers.edit") : t("customers.add")}
        </button>
        <Link href="/customers" className="cancel-btn">
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
