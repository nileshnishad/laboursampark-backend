import express from "express";
import { register, login, getProfile, updateProfile } from "../controllers/userController.js";
import { getVisibleUsers, getLabours, getContractors } from "../controllers/discoveryController.js";
import { authenticateToken, publicEndpoint } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// public routes (no authentication required)
// ==========================================

// POST /api/users/register - Register a new user (PUBLIC)
router.post("/register", publicEndpoint, register);

// POST /api/users/login - Login user (PUBLIC)
router.post("/login", publicEndpoint, login);

// GET /api/users/labours - Get all labour users with display=true (PUBLIC)
router.get("/labours", getLabours);

// GET /api/users/contractors - Get all contractor users with display=true (PUBLIC)
router.get("/contractors", getContractors);

// ==========================================
// PROTECTED ROUTES (authentication required)
// ==========================================

// GET /api/users/profile - Get user profile (PROTECTED)
router.get("/profile", authenticateToken, getProfile);

// POST /api/users/profile - Get user profile (PROTECTED)
router.post("/profile", authenticateToken, getProfile);

// PUT /api/users/profile - Update user profile (PROTECTED)
router.put("/profile", authenticateToken, updateProfile);

// PATCH /api/users/profile - Partial update user profile (PROTECTED)
router.patch("/profile", authenticateToken, updateProfile);

// GET /api/users/visible - Get visible users (contractors/labour) (PROTECTED)
router.get("/visible", authenticateToken, getVisibleUsers);

export default router;
