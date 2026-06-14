import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CustomerForm from "../CustomerForm";

interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string;
  credit: number;
}

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(parseInt(id)) as CustomerRow | undefined;
  if (!customer) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
        Edit Customer
      </h1>
      <div className="bg-surface-blur border-surface rounded-2xl p-8 shadow-xl">
        <CustomerForm customer={customer} />
      </div>
    </div>
  );
}
