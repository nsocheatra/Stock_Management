import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import LivestreamClient from "./LivestreamClient";

export default async function LivestreamPage() {
  await requirePermission("livestream.manage");

  const products = await db.prepare("SELECT id, name, sku, selling_price, price, quantity, image_url FROM products ORDER BY name").all() as any[];
  const streams = await db.prepare("SELECT * FROM livestreams ORDER BY created_at DESC").all() as any[];
  const liveProducts = await db.prepare(`
    SELECT lp.*, p.name as product_name, p.sku as product_sku, p.selling_price, p.price, p.quantity as stock, p.image_url
    FROM live_products lp JOIN products p ON lp.product_id = p.id ORDER BY lp.priority DESC
  `).all() as any[];
  const liveOrders = await db.prepare(`
    SELECT lo.*, u.name as driver_name
    FROM live_orders lo LEFT JOIN users u ON lo.driver_id = u.id
    ORDER BY lo.created_at DESC LIMIT 200
  `).all() as any[];
  const liveComments = await db.prepare("SELECT * FROM live_comments ORDER BY created_at DESC LIMIT 500").all() as any[];
  const users = await db.prepare("SELECT id, name, role FROM users WHERE active = 1 ORDER BY name").all() as any[];
  const allOrders = await db.prepare("SELECT * FROM fb_orders ORDER BY created_at DESC LIMIT 200").all() as any[];
  const allKeywords = await db.prepare(`
    SELECT fk.*, p.name as product_name, p.selling_price, p.price
    FROM fb_keywords fk JOIN products p ON fk.product_id = p.id ORDER BY fk.created_at DESC
  `).all() as any[];
  const fbPageUrl = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_page_url'").get() as any)?.value || "";
  const fbPageName = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_page_name'").get() as any)?.value || "";
  const fbPageId = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_page_id'").get() as any)?.value || "";
  const fbBusinessId = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_business_id'").get() as any)?.value || "";
  const fbAccessToken = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_access_token'").get() as any)?.value || "";
  const fbAppId = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_app_id'").get() as any)?.value || (await getSecret("facebook_app_id")) || "";
  const totalSales = (await db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM live_orders WHERE status != 'cancelled'").get() as any).total;
  const totalOrders = (await db.prepare("SELECT COUNT(*) as c FROM live_orders WHERE status != 'cancelled'").get() as any).c;
  const pendingOrders = (await db.prepare("SELECT COUNT(*) as c FROM live_orders WHERE status = 'pending'").get() as any).c;

  return (
    <LivestreamClient
      products={products}
      streams={streams}
      liveProducts={liveProducts}
      liveOrders={liveOrders}
      liveComments={liveComments}
      users={users}
      allOrders={allOrders}
      allKeywords={allKeywords}
      fbPageUrl={fbPageUrl}
      fbPageName={fbPageName}
      fbPageId={fbPageId}
      fbBusinessId={fbBusinessId}
      fbAccessToken={fbAccessToken}
      fbAppId={fbAppId}
      totalSales={totalSales}
      totalOrders={totalOrders}
      pendingOrders={pendingOrders}
    />
  );
}
