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
  const fbPageUrl = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_page_url'").get() as { value: string } | undefined)?.value || "";
  const fbPageName = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_page_name'").get() as { value: string } | undefined)?.value || "";
  const fbPageId = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_page_id'").get() as { value: string } | undefined)?.value || "";
  const fbAccessToken = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_access_token'").get() as { value: string } | undefined)?.value || "";
  const fbAppId = (await db.prepare("SELECT value FROM settings WHERE key = 'facebook_app_id'").get() as { value: string } | undefined)?.value || "";

  const livestreams = await db.prepare("SELECT * FROM livestreams ORDER BY created_at DESC").all() as any[];
  const driverRows = await db.prepare("SELECT id, name FROM users WHERE role IN ('driver', 'admin') ORDER BY name").all() as any[];

  return <LivestreamClient products={products} keywords={keywords} livestreams={livestreams} drivers={driverRows} fbPageUrl={fbPageUrl} fbPageName={fbPageName} fbPageId={fbPageId} fbAccessToken={fbAccessToken} fbAppId={fbAppId} />;
}
