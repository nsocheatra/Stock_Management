"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";

type Supplier = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export default function SupplierForm({
  supplier,
  action,
}: {
  supplier?: Supplier;
  action: ((formData: FormData) => Promise<void>) | ((id: number, formData: FormData) => Promise<void>);
}) {
  const isUpdate = !!supplier;
  const { t } = useTranslation();

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    if (isUpdate) {
      await (action as (id: number, formData: FormData) => Promise<void>)(supplier!.id, formData);
    } else {
      await (action as (formData: FormData) => Promise<void>)(formData);
    }
  };

  const [, formAction] = useActionState(wrappedAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="input-label">{t("suppliers.fields.name")}</label>
        <input
          name="name"
          defaultValue={supplier?.name}
          required
          placeholder={t("suppliers.placeholders.name")}
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">{t("suppliers.fields.email")}</label>
        <input
          name="email"
          type="email"
          defaultValue={supplier?.email ?? ""}
          placeholder={t("suppliers.placeholders.email")}
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">{t("suppliers.fields.phone")}</label>
        <input
          name="phone"
          defaultValue={supplier?.phone ?? ""}
          placeholder={t("suppliers.placeholders.phone")}
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">{t("suppliers.fields.address")}</label>
        <textarea
          name="address"
          rows={3}
          defaultValue={supplier?.address ?? ""}
          placeholder={t("suppliers.placeholders.address")}
          className="input-field resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer text-sm"
        >
          {isUpdate ? t("suppliers.edit") : t("suppliers.add")}
        </button>
        <Link
          href="/suppliers"
          className="cancel-btn"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}

