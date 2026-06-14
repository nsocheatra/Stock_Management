"use client";

import { useActionState } from "react";
import Link from "next/link";

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

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    if (isUpdate) {
      await (action as (id: number, formData: FormData) => Promise<void>)(supplier!.id, formData);
    } else {
      await (action as (formData: FormData) => Promise<void>)(formData);
    }
  };

  const [state, formAction] = useActionState(wrappedAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="input-label">Name</label>
        <input
          name="name"
          defaultValue={supplier?.name}
          required
          placeholder="e.g. Acme Corp"
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={supplier?.email ?? ""}
          placeholder="e.g. contact@acme.com"
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">Phone</label>
        <input
          name="phone"
          defaultValue={supplier?.phone ?? ""}
          placeholder="e.g. +1 (555) 019-2834"
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">Address</label>
        <textarea
          name="address"
          rows={3}
          defaultValue={supplier?.address ?? ""}
          placeholder="Corporate headquarters location..."
          className="input-field resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 cursor-pointer text-sm"
        >
          {isUpdate ? "Update Supplier" : "Create Supplier"}
        </button>
        <Link
          href="/suppliers"
          className="cancel-btn"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

