import { requirePermission } from "@/server/auth";
import { generateStockNotificationsData, getNotifications, getUnreadNotificationCount } from "@/server/notifications-data";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  await requirePermission("notifications.view");
  await generateStockNotificationsData();
  const notifications = await getNotifications();
  const unreadCount = await getUnreadNotificationCount();

  return <NotificationsClient notifications={notifications} unreadCount={unreadCount} />;
}
