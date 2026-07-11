import { T } from "@/components/T";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { updateSupplier } from "@/server/actions";
import SupplierForm from "../SupplierForm";

interface SupplierRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await db.prepare("SELECT * FROM suppliers WHERE id = ?").get(parseInt(id)) as SupplierRow | undefined;
  if (!supplier) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent"><T k="suppliers.edit" /></h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl">
        <SupplierForm supplier={supplier} action={updateSupplier} />
      </div>
    </div>
  );
}

