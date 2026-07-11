import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import POSClient from "./POSClient";

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  wholesale_price: number | null;
  selling_price: number | null;
  original_price: number | null;
  unit_price: number | null;
  price_per_case: number | null;
  quantity: number;
  image_url: string | null;
  category: string | null;
  has_variants: number;
  track_batches: number;
}

interface CustomerRow {
  id: number;
  name: string;
  customer_type: string;
}

interface PromotionRow {
  id: number;
  name: string;
  type: string;
  value: number;
  min_purchase: number;
  buy_qty: number;
  get_qty: number;
  product_id: number | null;
  start_date: string | null;
  end_date: string | null;
  active: number;
}

interface MemberRow {
  customer_id: number;
  tier_id: number;
  tier_name: string;
  discount_percent: number;
}

interface VariantRow {
  id: number;
  product_id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  quantity: number;
}

interface BatchRow {
  id: number;
  product_id: number;
  variant_id: number | null;
  batch_no: string;
  quantity: number;
  expiry_date: string | null;
  location_id: number | null;
}

interface LocationRow {
  id: number;
  name: string;
  address: string | null;
}

export default async function POSPage() {
  await requirePermission("pos.access");
  const products: ProductRow[] = JSON.parse(JSON.stringify(
    await db.prepare("SELECT id, name, sku, barcode, price, wholesale_price, selling_price, original_price, unit_price, price_per_case, quantity, image_url, category, has_variants, track_batches FROM products ORDER BY name ASC").all()
  ));
  const customers: CustomerRow[] = JSON.parse(JSON.stringify(
    await db.prepare("SELECT id, name, customer_type FROM customers ORDER BY name ASC").all()
  ));
  const now = new Date().toISOString().slice(0, 10);
  const promotions: PromotionRow[] = JSON.parse(JSON.stringify(
    await db.prepare("SELECT * FROM promotions WHERE active = 1 AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?) ORDER BY name ASC").all(now, now)
  ));
  const members: MemberRow[] = JSON.parse(JSON.stringify(
    await db.prepare(`
      SELECT m.customer_id, m.tier_id, mt.name as tier_name, mt.discount_percent
      FROM members m
      JOIN membership_tiers mt ON mt.id = m.tier_id
    `).all()
  ));
  const variants: VariantRow[] = JSON.parse(JSON.stringify(
    await db.prepare("SELECT id, product_id, name, sku, barcode, price, quantity FROM product_variants ORDER BY name ASC").all()
  ));
  const batches: BatchRow[] = JSON.parse(JSON.stringify(
    await db.prepare("SELECT id, product_id, variant_id, batch_no, quantity, expiry_date, location_id FROM batches WHERE quantity > 0 ORDER BY expiry_date ASC").all()
  ));
  const locations: LocationRow[] = JSON.parse(JSON.stringify(
    await db.prepare("SELECT id, name, address FROM locations ORDER BY name ASC").all()
  ));

  return (
    <POSClient
      products={products}
      customers={customers}
      promotions={promotions}
      members={members}
      variants={variants}
      batches={batches}
      locations={locations}
    />
  );
}
