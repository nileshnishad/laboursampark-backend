import express from "express";
import {
  createJob,
  getJobs,
  getMyJobs,
  getJobById,
  updateJob,
  deleteJob,
  applyToJob,
  getJobApplications,
  selectWorker,
  completeJob,
  toggleJobActivation,
  getApplicationsForJob,
  getAllJobsForApplicant,
  getAllAppliedJobs,
  getAllAcceptedJobs,
  getAllCompletedJobs,
} from "../controllers/jobController.js";
import { getJobStats } from "../controllers/jobStatsController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// PROTECTED ROUTES (authentication required)
// ==========================================

// CREATE JOB
// POST /api/jobs/create-job - Create a new job (Contractor/Sub-contractor only)
router.post("/create-job", authenticateToken, createJob);

// GET ALL JOBS
// GET /api/jobs - Get jobs based on visibility rules
router.get("/", authenticateToken, getJobs);

// GET MY JOBS
// GET /api/jobs/my-jobs - Get jobs posted by current user
router.get("/my-jobs", authenticateToken, getMyJobs);

// GET JOB STATS — returns different stats based on logged-in user's userType
// GET /api/jobs/stats
router.get("/stats", authenticateToken, getJobStats);

// GET APPLICATIONS FOR A JOB (job creator only)
// GET /api/jobs/getApplication?jobId=xxx&status=pending&page=1&limit=20
router.get("/getApplication", authenticateToken, getApplicationsForJob);

// GET ALL JOBS FEED (labour & sub_contractor only) — excludes already-applied jobs
// GET /api/jobs/getalljobs?search=&skills=Mason&city=Mumbai&sort=newest&page=1&limit=10
router.get("/getalljobs", authenticateToken, getAllJobsForApplicant);

// GET ALL APPLIED JOBS — jobs the user has applied to (default: pending only)
// GET /api/jobs/getallappliedjobs?status=pending&search=renovation&page=1&limit=10
router.get("/getallappliedjobs", authenticateToken, getAllAppliedJobs);

// GET ALL ACCEPTED JOBS — jobs where user's application is accepted
// GET /api/jobs/getallacceptedjobs?search=renovation&page=1&limit=10
router.get("/getallacceptedjobs", authenticateToken, getAllAcceptedJobs);

// GET ALL COMPLETED JOBS — jobs where user's application is completed (includes review)
// GET /api/jobs/getallcompletedjobs?search=renovation&page=1&limit=10
router.get("/getallcompletedjobs", authenticateToken, getAllCompletedJobs);

// GET JOB BY ID  (⚠️ wildcard — must stay AFTER all fixed-path GET routes)
// GET /api/jobs/:jobId - Get specific job details
router.get("/:jobId", authenticateToken, getJobById);

// UPDATE JOB
// PUT /api/jobs/:jobId - Update job (only by creator)
router.put("/:jobId", authenticateToken, updateJob);

// DELETE JOB
// DELETE /api/jobs/:jobId - Delete job (only by creator)
router.delete("/:jobId", authenticateToken, deleteJob);

// APPLY TO JOB
// POST /api/jobs/:jobId/apply - Apply/Show interest in job
router.post("/:jobId/apply", authenticateToken, applyToJob);

// GET JOB APPLICATIONS
// GET /api/jobs/:jobId/applications - Get all applications for job (only by creator)
router.get("/:jobId/applications", authenticateToken, getJobApplications);

// SELECT WORKER
// POST /api/jobs/:jobId/select-worker - Select worker for job (only by creator)
router.post("/:jobId/select-worker", authenticateToken, selectWorker);

// COMPLETE JOB
// POST /api/jobs/:jobId/complete - Mark job as completed (only by creator)
router.post("/:jobId/complete", authenticateToken, completeJob);

// TOGGLE JOB ACTIVATION
// POST /api/jobs/:jobId/toggle-activation - Activate/Deactivate job (only by creator)
router.post("/:jobId/toggle-activation", authenticateToken, toggleJobActivation);

export default router;
