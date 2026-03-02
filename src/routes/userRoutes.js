import express from "express";
import { register, login, getProfile, updateProfile } from "../controllers/userController.js";
import { authenticateToken, publicEndpoint } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// public routes (no authentication required)
// ==========================================

// POST /api/users/register - Register a new user (PUBLIC)
router.post("/register", publicEndpoint, register);

// POST /api/users/login - Login user (PUBLIC)
router.post("/login", publicEndpoint, login);

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

export default router;
