import { db } from "@/lib/db";
import { T } from "@/components/T";
import { createCustomerOrder } from "@/lib/actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrderForm from "./OrderForm";

export default function NewOrderPage() {
  const customers = db.prepare("SELECT id, name, phone FROM customers ORDER BY name ASC").all() as any[];
  const products = db.prepare("SELECT id, name, sku, price, selling_price, quantity FROM products WHERE quantity > 0 ORDER BY name ASC").all() as any[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-xl hover:bg-surface text-muted hover:text-default transition-all">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="orders.new" />
          </h1>
        </div>
      </div>

      <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl">
        <OrderForm customers={customers} products={products} />
      </div>
    </div>
  );
}
