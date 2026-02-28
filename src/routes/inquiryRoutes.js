import express from "express";
import {
  submitInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
} from "../controllers/inquiryController.js";
import { authenticateToken, publicEndpoint } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 📝 INQUIRY ROUTES
// ==========================================

// POST /api/inquiries - Submit new inquiry (PUBLIC - no auth required)
router.post("/", publicEndpoint, submitInquiry);

// GET /api/inquiries - Get all inquiries (PROTECTED - requires auth)
router.get("/", authenticateToken, getAllInquiries);

// GET /api/inquiries/stats - Get inquiry statistics (PROTECTED - requires auth)
router.get("/stats", authenticateToken, getInquiryStats);

// GET /api/inquiries/:id - Get inquiry by ID (PROTECTED - requires auth)
router.get("/:id", authenticateToken, getInquiryById);

// PUT /api/inquiries/:id - Update inquiry (PROTECTED - requires auth)
router.put("/:id", authenticateToken, updateInquiry);

// DELETE /api/inquiries/:id - Delete inquiry (PROTECTED - requires auth)
router.delete("/:id", authenticateToken, deleteInquiry);

export default router;
