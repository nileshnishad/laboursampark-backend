import express from "express";
import {
  createEnquiry,
  getJobEnquiries,
  getMyEnquiries,
  getAppliedJobs,
  acceptEnquiry,
  rejectEnquiry,
  withdrawEnquiry,
  getEnquiryDetails,
  addNotesToEnquiry,
} from "../controllers/jobEnquiryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 📧 JOB ENQUIRY ROUTES (all protected)
// ==========================================

// CREATE ENQUIRY
// POST /api/job-enquiries/:jobId - Apply/enquire for a job (labour/sub_contractor)
router.post("/:jobId", authenticateToken, createEnquiry);

// GET JOB ENQUIRIES
// GET /api/job-enquiries/job/:jobId - Get all enquiries for a job (only job creator)
router.get("/job/:jobId", authenticateToken, getJobEnquiries);

// GET MY ENQUIRIES
// GET /api/job-enquiries/my/list - Get all enquiries submitted by current user
router.get("/my/list", authenticateToken, getMyEnquiries);

// GET APPLIED JOBS (with full job details)
// GET /api/job-enquiries/applied/jobs - Get all jobs user has applied to with full details
router.get("/applied/jobs", authenticateToken, getAppliedJobs);

// GET ENQUIRY DETAILS
// GET /api/job-enquiries/:enquiryId - Get specific enquiry details
router.get("/:enquiryId", authenticateToken, getEnquiryDetails);

// ACCEPT ENQUIRY
// POST /api/job-enquiries/:enquiryId/accept - Job creator accepts enquiry
router.post("/:enquiryId/accept", authenticateToken, acceptEnquiry);

// REJECT ENQUIRY
// POST /api/job-enquiries/:enquiryId/reject - Job creator rejects enquiry
router.post("/:enquiryId/reject", authenticateToken, rejectEnquiry);

// WITHDRAW ENQUIRY
// POST /api/job-enquiries/:enquiryId/withdraw - Applicant withdraws enquiry
router.post("/:enquiryId/withdraw", authenticateToken, withdrawEnquiry);

// ADD NOTES
// PUT /api/job-enquiries/:enquiryId/notes - Job creator adds notes to enquiry
router.put("/:enquiryId/notes", authenticateToken, addNotesToEnquiry);

export default router;
