import "server-only";
import { db } from "./db";

export async function generateStockNotificationsData() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const hasUnread = db.prepare(
    "SELECT id FROM notifications WHERE type = ? AND reference_type = ? AND reference_id = ? AND is_read = 0"
  );
  const insert = db.prepare(
    "INSERT INTO notifications (type, title, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?)"
  );
  const deleteResolved = db.prepare(
    "DELETE FROM notifications WHERE type = ? AND reference_type = ? AND reference_id = ? AND is_read = 0"
  );

  const okProducts = await db.prepare(
    "SELECT id FROM products WHERE quantity > min_stock"
  ).all() as { id: number }[];
  for (const p of okProducts) {
    await deleteResolved.run("low_stock", "product", p.id);
  }

  const lowStockProducts = await db.prepare(
    "SELECT id, name, quantity, min_stock FROM products WHERE quantity <= min_stock"
  ).all() as { id: number; name: string; quantity: number; min_stock: number }[];

  for (const p of lowStockProducts) {
    const existing = await hasUnread.get("low_stock", "product", p.id) as { id: number } | undefined;
    if (!existing) {
      await insert.run(
        "low_stock", `Low Stock: ${p.name}`,
        `Only ${p.quantity} left (min: ${p.min_stock})`,
        "product", p.id
      );
    }
  }

  const resolvedBatches = await db.prepare(
    "SELECT id FROM batches WHERE expiry_date IS NULL OR quantity = 0"
  ).all() as { id: number }[];
  for (const b of resolvedBatches) {
    await deleteResolved.run("expiring_batch", "batch", b.id);
    await deleteResolved.run("expired_batch", "batch", b.id);
  }

  const expiringBatches = await db.prepare(
    `SELECT b.id, b.batch_no, b.expiry_date, b.quantity, p.name as product_name
     FROM batches b JOIN products p ON p.id = b.product_id
     WHERE b.expiry_date IS NOT NULL AND b.expiry_date <= ? AND b.expiry_date >= ? AND b.quantity > 0`
  ).all(thirtyDaysFromNow, today) as { id: number; batch_no: string; expiry_date: string; quantity: number; product_name: string }[];

  for (const b of expiringBatches) {
    const existing = await hasUnread.get("expiring_batch", "batch", b.id) as { id: number } | undefined;
    if (!existing) {
      await insert.run(
        "expiring_batch", `Expiring Soon: ${b.product_name}`,
        `Batch ${b.batch_no} expires ${b.expiry_date} (${b.quantity} units)`,
        "batch", b.id
      );
    }
  }

  const expiredBatches = await db.prepare(
    `SELECT b.id, b.batch_no, b.expiry_date, b.quantity, p.name as product_name
     FROM batches b JOIN products p ON p.id = b.product_id
     WHERE b.expiry_date IS NOT NULL AND b.expiry_date < ? AND b.quantity > 0`
  ).all(today) as { id: number; batch_no: string; expiry_date: string; quantity: number; product_name: string }[];

  for (const b of expiredBatches) {
    const existing = await hasUnread.get("expired_batch", "batch", b.id) as { id: number } | undefined;
    if (!existing) {
      await insert.run(
        "expired_batch", `Expired: ${b.product_name}`,
        `Batch ${b.batch_no} expired ${b.expiry_date} (${b.quantity} units remaining)`,
        "batch", b.id
      );
    }
  }
}

export async function getNotifications() {
  return await db.prepare(
    "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200"
  ).all() as Array<{
    id: number; type: string; title: string; message: string;
    reference_type: string | null; reference_id: number | null;
    is_read: number; created_at: string;
  }>;
}

export async function getUnreadNotificationCount() {
  const row = await db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0"
  ).get() as { count: number };
  return row.count;
}

export async function markNotificationRead(id: number) {
  await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
}

export async function markAllNotificationsRead() {
  await db.prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run();
}

export async function clearAllNotifications() {
  await db.prepare("DELETE FROM notifications").run();
}
