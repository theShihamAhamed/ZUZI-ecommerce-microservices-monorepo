import express, { Router } from "express";
import { isAuthenticated } from "@middleware/auth.middleware";
import {
  createInternalNotification,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller";

const router: Router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "notification-service",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.post("/internal/notifications", createInternalNotification);
router.get("/notifications/unread-count", isAuthenticated, getUnreadCount);
router.get("/notifications", isAuthenticated, getNotifications);
router.patch("/notifications/read-all", isAuthenticated, markAllNotificationsRead);
router.patch("/notifications/:id/read", isAuthenticated, markNotificationRead);
router.delete("/notifications/:id", isAuthenticated, deleteNotification);

export default router;
