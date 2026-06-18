import { requirePermission } from "@/lib/auth";
import { getNotifications, getUnreadNotificationCount, generateStockNotifications } from "@/lib/actions";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  await requirePermission("notifications.view");
  await generateStockNotifications();
  const notifications = await getNotifications();
  const unreadCount = await getUnreadNotificationCount();

  return <NotificationsClient notifications={notifications} unreadCount={unreadCount} />;
}
