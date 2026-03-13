import express from "express";
import {
  getUserActivityHistory,
  getActivityByType,
  getActivitySummary,
  getActivityTimeline,
  deleteActivityHistory,
  clearAllActivityHistory,
  getRelatedEntityActivities,
} from "../controllers/activityHistoryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 📝 ACTIVITY HISTORY ROUTES (all protected)
// ==========================================

// GET USER ACTIVITY HISTORY
// GET /api/activity-history - Get all user activities with pagination
router.get("/", authenticateToken, getUserActivityHistory);

// GET ACTIVITY SUMMARY
// GET /api/activity-history/summary - Get activity summary and breakdown
router.get("/summary/overview", authenticateToken, getActivitySummary);

// GET ACTIVITY TIMELINE
// GET /api/activity-history/timeline - Get activities grouped by date
router.get("/timeline/grouped", authenticateToken, getActivityTimeline);

// GET ACTIVITY BY TYPE
// GET /api/activity-history/type/:activityType - Get activities by specific type
router.get("/type/:activityType", authenticateToken, getActivityByType);

// GET RELATED ENTITY ACTIVITIES
// GET /api/activity-history/entity/:relatedId - Get all activities for a specific entity
router.get("/entity/:relatedId", authenticateToken, getRelatedEntityActivities);

// DELETE SINGLE ACTIVITY
// DELETE /api/activity-history/:activityId - Delete a specific activity
router.delete("/:activityId", authenticateToken, deleteActivityHistory);

// CLEAR ALL ACTIVITY HISTORY
// DELETE /api/activity-history/clear/all - Delete all user activities
router.delete("/clear/all", authenticateToken, clearAllActivityHistory);

export default router;
