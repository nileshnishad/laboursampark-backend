import express from "express";
import * as userJobHistoryController from "../controllers/userJobHistoryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// User's own job history routes
router.get("/my/all", authenticateToken, userJobHistoryController.getUserJobHistory);
router.get("/my/stats", authenticateToken, userJobHistoryController.getJobHistoryStats);
router.get("/my/applied", authenticateToken, userJobHistoryController.getAppliedJobsHistory);
router.get("/my/accepted", authenticateToken, userJobHistoryController.getAcceptedJobsHistory);
router.get("/my/rejected", authenticateToken, userJobHistoryController.getRejectedJobsHistory);
router.get("/my/withdrawn", authenticateToken, userJobHistoryController.getWithdrawnJobsHistory);
router.get("/my/completed", authenticateToken, userJobHistoryController.getCompletedJobsHistory);
router.get("/my/detail/:jobHistoryId", authenticateToken, userJobHistoryController.getDetailedJobHistory);
router.get("/my/timeline/:jobHistoryId", authenticateToken, userJobHistoryController.getApplicationTimeline);

// Smart API - Auto-detects user type (contractor/labour) and returns appropriate data
router.get("/smart/dashboard", authenticateToken, userJobHistoryController.getApplicationsByUserType);

// Contractor's applications received
router.get("/contractor/applications", authenticateToken, userJobHistoryController.getJobApplicationsByContractor);

export default router;
