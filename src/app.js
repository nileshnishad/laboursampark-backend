// ==========================================
// 🚀 EXPRESS APPLICATION SETUP
// ==========================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// ==========================================
// 🛣️ ROUTE IMPORTS
// ==========================================

import userRoutes from "./routes/userRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import jobEnquiryRoutes from "./routes/jobEnquiryRoutes.js";
import activityHistoryRoutes from "./routes/activityHistoryRoutes.js";
import userJobHistoryRoutes from "./routes/userJobHistoryRoutes.js";
import userReviewRoutes from "./routes/userReviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import twilioRoutes from "./routes/twilioRoutes.js";

// ==========================================
// 🔐 ENVIRONMENT CONFIGURATION
// ==========================================

dotenv.config();

// ==========================================
// 🏗️ EXPRESS APP INITIALIZATION
// ==========================================

const app = express();

// ==========================================
// 🌐 CORS CONFIGURATION
// ==========================================

app.use(cors({ origin: "*" }));

// ==========================================
// 🛡️ SECURITY & PARSING MIDDLEWARE
// ==========================================

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ==========================================
// SMS/OTP Routes (must be after app is initialized)
// ==========================================
app.use("/api/sms", smsRoutes);

// ==========================================
// 📁 HEALTH CHECK & BASIC ROUTES
// ==========================================

app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "LabourSampark API Running 🚀",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 🛣️ API ROUTES CONFIGURATION
// ==========================================

// ==========================================
// 🟢 PUBLIC ROUTES (No Authentication Required)
// ==========================================

// Authentication & User Routes
// POST /api/users/register - Register new user (PUBLIC)
// POST /api/users/login - Login user (PUBLIC)
app.use("/api/users", userRoutes);
app.use("/auth", userRoutes);
app.use("/api/public", publicRoutes);

// ==========================================
// 🔒 PROTECTED & MIXED ROUTES
// ==========================================

// User Profile Routes
// GET/POST /api/users/profile - Get user profile (PROTECTED)

// Inquiry Routes (submission is PUBLIC, others are PROTECTED)
// POST /api/inquiries - Submit inquiry (PUBLIC)
// GET /api/inquiries - Get all inquiries (PROTECTED)
// PUT/DELETE /api/inquiries/:id - Update/Delete inquiries (PROTECTED)
app.use("/api/inquiries", inquiryRoutes);

// Document Routes
app.use("/api/documents", documentRoutes);

// Job Routes (all protected)
// POST /api/jobs - Create job
// GET /api/jobs - Get jobs with visibility rules
// GET /api/jobs/:jobId - Get job details
// PUT/DELETE /api/jobs/:jobId - Update/Delete job
// POST /api/jobs/:jobId/apply - Apply to job
// POST /api/jobs/:jobId/select-worker - Select worker
app.use("/api/jobs", jobRoutes);

// Job Enquiry Routes (all protected)
// POST /api/job-enquiries/:jobId - Create enquiry
// GET /api/job-enquiries/job/:jobId - Get enquiries for job (creator only)
// GET /api/job-enquiries/my/list - Get my enquiries
// POST /api/job-enquiries/:enquiryId/accept - Accept enquiry
// POST /api/job-enquiries/:enquiryId/reject - Reject enquiry
// POST /api/job-enquiries/:enquiryId/withdraw - Withdraw enquiry
app.use("/api/job-enquiries", jobEnquiryRoutes);

// Activity History Routes (all protected)
// GET /api/activity-history - Get user activities
// GET /api/activity-history/summary/overview - Get activity summary
// GET /api/activity-history/timeline/grouped - Get activity timeline
// GET /api/activity-history/type/:activityType - Get by type
// DELETE /api/activity-history/:activityId - Delete activity
app.use("/api/activity-history", activityHistoryRoutes);

// User Job History Routes (all protected)
// GET /api/job-history/my/all - Get all job history
// GET /api/job-history/my/stats - Get job history statistics
// GET /api/job-history/my/applied - Get applied jobs
// GET /api/job-history/my/accepted - Get accepted jobs
// GET /api/job-history/my/rejected - Get rejected jobs
// GET /api/job-history/my/withdrawn - Get withdrawn jobs
// GET /api/job-history/my/completed - Get completed jobs
// GET /api/job-history/contractor/applications - Get applications received (contractor)
app.use("/api/job-history", userJobHistoryRoutes);

// User Review Routes (all protected)
// POST /api/user-reviews/submit - Submit review after job completion
// GET /api/user-reviews/user/:userId - Get all reviews for a user
// GET /api/user-reviews/job/:jobId - Get all reviews for a job
// GET /api/user-reviews/rating/:userId - Get detailed rating info
// GET /api/user-reviews/:reviewId - Get single review
// POST /api/user-reviews/:reviewId/helpful - Mark review as helpful
// DELETE /api/user-reviews/:reviewId - Delete review (reviewer only)
app.use("/api/user-reviews", userReviewRoutes);

// Notification Routes (all protected)
// GET /api/notifications - Get all notifications for current user
// GET /api/notifications/unread/count - Get count of unread notifications
// PUT /api/notifications/:notificationId/read - Mark notification as read
// PUT /api/notifications/mark/all-read - Mark all as read
// DELETE /api/notifications/:notificationId - Delete notification
// DELETE /api/notifications/delete/all - Delete all notifications
app.use("/api/notifications", notificationRoutes);

// Payment Routes (PayU)
// POST /api/payments/payu/create-link - Create secure backend-owned payment link
// GET /api/payments/checkout/:token - Redirects user to PayU hosted checkout
// POST /api/payments/payu/callback/success - PayU success callback
// POST /api/payments/payu/callback/failure - PayU failure callback
// GET /api/payments/:paymentId/status - Get payment status for logged-in user
// GET /api/payments/history - Get user payment history
app.use("/api/payments", paymentRoutes);

// Twilio Routes
app.use("/api/twilio", twilioRoutes);

// ==========================================
// ❌ ERROR HANDLING MIDDLEWARE
// ==========================================

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An error occurred",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

// ==========================================
// 🚀 EXPORT FOR DEPLOYMENT
// ==========================================

export default app;
