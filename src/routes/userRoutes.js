import express from "express";
import { register, login, getProfile } from "../controllers/userController.js";
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

// GET/POST /api/users/profile - Get user profile (PROTECTED)
router.post("/profile", authenticateToken, getProfile);
router.get("/profile", authenticateToken, getProfile);

export default router;
