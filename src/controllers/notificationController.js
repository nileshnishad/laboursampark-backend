import Notification from "../models/Notification.js";
import { logActivity } from "../utils/activityLogger.js";

// ==========================================
// 📬 GET USER NOTIFICATIONS
// ==========================================

export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { isRead, page = 1, limit = 10, sortBy = "newest" } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Build filter
    let filter = { userId };

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sortBy === "unread") {
      filter.isRead = false;
      sortOption = { priority: -1, createdAt: -1 };
    }

    const notifications = await Notification.find(filter)
      .populate("relatedUserId", "fullName profilePhotoUrl")
      .populate("jobId", "workTitle")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching notifications",
      error: error.message,
    });
  }
};

// ==========================================
// 📬 MARK NOTIFICATION AS READ
// ==========================================

export const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!notificationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID format",
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check authorization
    if (notification.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only mark your own notifications as read",
      });
    }

    // Mark as read
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    console.log("✅ Notification marked as read:", notificationId);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while marking notification as read",
      error: error.message,
    });
  }
};

// ==========================================
// 📬 MARK ALL NOTIFICATIONS AS READ
// ==========================================

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    console.log("✅ Marked all notifications as read:", result.modifiedCount);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while marking all notifications as read",
      error: error.message,
    });
  }
};

// ==========================================
// 📬 DELETE NOTIFICATION
// ==========================================

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!notificationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID format",
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check authorization
    if (notification.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own notifications",
      });
    }

    await Notification.findByIdAndDelete(notificationId);
    console.log("✅ Notification deleted:", notificationId);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting notification",
      error: error.message,
    });
  }
};

// ==========================================
// 📬 DELETE ALL NOTIFICATIONS
// ==========================================

export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const result = await Notification.deleteMany({ userId });

    console.log("✅ All notifications deleted for user:", userId);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notifications deleted`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting all notifications",
      error: error.message,
    });
  }
};

// ==========================================
// 📬 GET UNREAD NOTIFICATION COUNT
// ==========================================

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Unread notification count fetched",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching unread count",
      error: error.message,
    });
  }
};
