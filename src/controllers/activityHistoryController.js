import ActivityHistory from "../models/ActivityHistory.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// ==========================================
// 📝 LOG ACTIVITY (Internal utility)
// ==========================================

export const logActivity = async ({
  userId,
  activityType,
  relatedId,
  relatedModel,
  description,
  details,
  ipAddress,
  userAgent,
  status = "success",
  errorMessage,
}) => {
  try {
    const activity = new ActivityHistory({
      userId,
      activityType,
      relatedId,
      relatedModel,
      description,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage,
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

// ==========================================
// 📊 GET USER ACTIVITY HISTORY
// ==========================================

export const getUserActivityHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { activityType, page = 1, limit = 20, sort = "desc" } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Build filter
    let filter = { userId };
    if (activityType) {
      filter.activityType = activityType;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get activities
    const activities = await ActivityHistory.find(filter)
      .populate("relatedId")
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityHistory.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Activity history fetched successfully",
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get activity history error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching activity history",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 GET ACTIVITY BY TYPE
// ==========================================

export const getActivityByType = async (req, res) => {
  try {
    const userId = req.userId;
    const { activityType } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate activity type
    const validTypes = [
      "job_created",
      "job_updated",
      "job_deleted",
      "job_completed",
      "enquiry_created",
      "enquiry_accepted",
      "enquiry_rejected",
      "enquiry_withdrawn",
      "worker_selected",
      "profile_updated",
      "login",
    ];

    if (!validTypes.includes(activityType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity type. Valid types: ${validTypes.join(", ")}`,
      });
    }

    // Pagination
    const skip = (page - 1) * limit;

    const activities = await ActivityHistory.find({
      userId,
      activityType,
    })
      .populate("relatedId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityHistory.countDocuments({
      userId,
      activityType,
    });

    res.status(200).json({
      success: true,
      message: `${activityType} activities fetched successfully`,
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get activity by type error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching activities",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 GET ACTIVITY SUMMARY
// ==========================================

export const getActivitySummary = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Get counts by activity type
    const summary = await ActivityHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$activityType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get total activities
    const totalActivities = await ActivityHistory.countDocuments({ userId });

    // Get last activity
    const lastActivity = await ActivityHistory.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate("relatedId");

    // Get activities from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivities = await ActivityHistory.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo },
    });

    res.status(200).json({
      success: true,
      message: "Activity summary fetched successfully",
      data: {
        totalActivities,
        recentActivitiesLast7Days: recentActivities,
        activityBreakdown: summary,
        lastActivity,
      },
    });
  } catch (error) {
    console.error("Get activity summary error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching activity summary",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 GET ACTIVITY TIMELINE
// ==========================================

export const getActivityTimeline = async (req, res) => {
  try {
    const userId = req.userId;
    const { days = 7 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Get activities from specified days
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await ActivityHistory.find({
      userId,
      createdAt: { $gte: startDate },
    })
      .populate("relatedId")
      .sort({ createdAt: -1 });

    // Group by date
    const timeline = {};
    activities.forEach((activity) => {
      const dateKey = new Date(activity.createdAt)
        .toISOString()
        .split("T")[0];

      if (!timeline[dateKey]) {
        timeline[dateKey] = [];
      }
      timeline[dateKey].push(activity);
    });

    res.status(200).json({
      success: true,
      message: "Activity timeline fetched successfully",
      data: {
        timeline,
        totalActivities: activities.length,
        period: `Last ${days} days`,
      },
    });
  } catch (error) {
    console.error("Get activity timeline error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching activity timeline",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 DELETE ACTIVITY HISTORY
// ==========================================

export const deleteActivityHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { activityId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!activityId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID format",
      });
    }

    const activity = await ActivityHistory.findById(activityId);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    // Check authorization
    if (activity.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own activity history",
      });
    }

    await ActivityHistory.findByIdAndDelete(activityId);

    res.status(200).json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting activity",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 CLEAR ALL ACTIVITY HISTORY
// ==========================================

export const clearAllActivityHistory = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const result = await ActivityHistory.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} activities cleared successfully`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("Clear activity history error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while clearing activity history",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 GET RELATED ENTITY ACTIVITIES
// ==========================================

export const getRelatedEntityActivities = async (req, res) => {
  try {
    const userId = req.userId;
    const { relatedId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!relatedId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID format",
      });
    }

    // Pagination
    const skip = (page - 1) * limit;

    const activities = await ActivityHistory.find({
      relatedId: new mongoose.Types.ObjectId(relatedId),
    })
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityHistory.countDocuments({
      relatedId: new mongoose.Types.ObjectId(relatedId),
    });

    res.status(200).json({
      success: true,
      message: "Entity activities fetched successfully",
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get related entity activities error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching entity activities",
      error: error.message,
    });
  }
};
