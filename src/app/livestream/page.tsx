import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import LivestreamClient from "./LivestreamClient";

export default async function LivestreamPage() {
  await requirePermission("livestream.manage");

  const products = await db.prepare("SELECT id, name, selling_price, price FROM products ORDER BY name").all() as any[];
  const keywords = await db.prepare(`
    SELECT fk.*, p.name as product_name, p.selling_price, p.price
    FROM fb_keywords fk JOIN products p ON fk.product_id = p.id
    ORDER BY fk.created_at DESC
  `).all() as any[];
  const orders = await db.prepare("SELECT * FROM fb_orders ORDER BY created_at DESC").all() as any[];
  const streamUrl = (await db.prepare("SELECT value FROM settings WHERE key = 'livestream_url'").get() as { value: string } | undefined)?.value || "";

  return <LivestreamClient products={products} keywords={keywords} orders={orders} streamUrl={streamUrl} />;
}
