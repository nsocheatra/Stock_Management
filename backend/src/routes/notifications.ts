import { Router, Request, Response } from "express";
import { generateStockNotificationsData, getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead, clearAllNotifications } from "../notifications-data.js";
import { requireAuth } from "../middleware/auth.js";
import { intParam } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const notifications = await getNotifications();
  res.json(notifications);
});

router.get("/unread-count", requireAuth, async (_req: Request, res: Response) => {
  const count = await getUnreadNotificationCount();
  res.json({ count });
});

router.post("/generate", requireAuth, async (_req: Request, res: Response) => {
  await generateStockNotificationsData();
  res.json({ success: true });
});

router.put("/:id/read", requireAuth, async (req: Request, res: Response) => {
  await markNotificationRead(intParam(req, "id"));
  res.json({ success: true });
});

router.put("/read-all", requireAuth, async (_req: Request, res: Response) => {
  await markAllNotificationsRead();
  res.json({ success: true });
});

router.delete("/", requireAuth, async (_req: Request, res: Response) => {
  await clearAllNotifications();
  res.json({ success: true });
});

export default router;
