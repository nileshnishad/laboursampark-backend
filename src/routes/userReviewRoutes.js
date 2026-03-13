import express from "express";
import * as userReviewController from "../controllers/userReviewController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 📝 USER REVIEW ROUTES (all protected)
// ==========================================

// Submit review after job completion
// POST /api/user-reviews/submit
router.post("/submit", authenticateToken, userReviewController.submitUserReview);

// Get all reviews for a specific user
// GET /api/user-reviews/user/:userId
router.get("/user/:userId", userReviewController.getUserReviews);

// Get all reviews for a specific job
// GET /api/user-reviews/job/:jobId
router.get("/job/:jobId", userReviewController.getJobReviews);

// Get detailed rating info for a user
// GET /api/user-reviews/rating/:userId
router.get("/rating/:userId", userReviewController.getUserRatingDetails);

// Get single review details
// GET /api/user-reviews/:reviewId
router.get("/:reviewId", userReviewController.getReviewById);

// Mark review as helpful
// POST /api/user-reviews/:reviewId/helpful
router.post(
  "/:reviewId/helpful",
  authenticateToken,
  userReviewController.markReviewHelpful
);

// Delete review (reviewer only)
// DELETE /api/user-reviews/:reviewId
router.delete(
  "/:reviewId",
  authenticateToken,
  userReviewController.deleteReview
);

export default router;
