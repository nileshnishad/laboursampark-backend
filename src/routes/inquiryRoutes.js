import express from "express";
import {
  submitInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
} from "../controllers/inquiryController.js";

const router = express.Router();

// ==========================================
// 📝 INQUIRY ROUTES
// ==========================================

// POST /api/inquiries - Submit new inquiry (public)
router.post("/", submitInquiry);

// GET /api/inquiries - Get all inquiries (admin)
router.get("/", getAllInquiries);

// GET /api/inquiries/stats - Get inquiry statistics (admin)
router.get("/stats", getInquiryStats);

// GET /api/inquiries/:id - Get inquiry by ID (admin)
router.get("/:id", getInquiryById);

// PUT /api/inquiries/:id - Update inquiry (admin)
router.put("/:id", updateInquiry);

// DELETE /api/inquiries/:id - Delete inquiry (admin)
router.delete("/:id", deleteInquiry);

export default router;
