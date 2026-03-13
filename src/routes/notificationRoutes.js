import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
} from "../controllers/notificationController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 📬 NOTIFICATION ROUTES (all protected)
// ==========================================

// GET ALL NOTIFICATIONS
// GET /api/notifications - Get all notifications for current user
// Query params: isRead (true/false), page, limit, sortBy (newest/oldest/unread)
router.get("/", authenticateToken, getNotifications);

// GET UNREAD COUNT
// GET /api/notifications/unread/count - Get count of unread notifications
router.get("/unread/count", authenticateToken, getUnreadCount);

// MARK AS READ
// PUT /api/notifications/:notificationId/read - Mark specific notification as read
router.put("/:notificationId/read", authenticateToken, markAsRead);

// MARK ALL AS READ
// PUT /api/notifications/mark/all-read - Mark all notifications as read
router.put("/mark/all-read", authenticateToken, markAllAsRead);

// DELETE NOTIFICATION
// DELETE /api/notifications/:notificationId - Delete specific notification
router.delete("/:notificationId", authenticateToken, deleteNotification);

// DELETE ALL NOTIFICATIONS
// DELETE /api/notifications/delete/all - Delete all notifications for user
router.delete("/delete/all", authenticateToken, deleteAllNotifications);

export default router;
