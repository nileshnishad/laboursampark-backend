import express from "express";
import { register, login, getProfile, updateProfile, forgotPassword, resetPassword, changePassword, configCheck, sendOTP, verifyOTP, resetPasswordWithOTP, getAllUsers, adminUpdateUser } from "../controllers/userController.js";
import { getVisibleUsers, getLabours, getContractors } from "../controllers/discoveryController.js";
import { authenticateToken, publicEndpoint, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// public routes (no authentication required)
// ==========================================

// POST /api/users/register - Register a new user (PUBLIC)
router.post("/register", publicEndpoint, register);

// POST /api/users/login - Login user (PUBLIC)
router.post("/login", publicEndpoint, login);

// POST /api/users/forgot-password - Request password reset (PUBLIC)
router.post("/forgot-password", publicEndpoint, forgotPassword);

// POST /api/users/reset-password - Reset password with token (PUBLIC)
router.post("/reset-password", publicEndpoint, resetPassword);

// POST /api/users/send-otp - Send OTP to user email (PUBLIC)
router.post("/send-otp", publicEndpoint, sendOTP);

// POST /api/users/verify-otp - Verify OTP from database (PUBLIC)
router.post("/verify-otp", publicEndpoint, verifyOTP);

// POST /api/users/reset-password-otp - Reset password after OTP verification (PUBLIC)
router.post("/reset-password-otp", publicEndpoint, resetPasswordWithOTP);

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

// POST /api/users/change-password - Change password for authenticated user (PROTECTED)
router.post("/change-password", authenticateToken, changePassword);

// POST /api/users/config-check - Validate app config and save FCM token (PROTECTED)
router.post("/config-check", authenticateToken, configCheck);

// GET /api/users/visible - Get visible users (contractors/labour) (PROTECTED)
router.get("/visible", authenticateToken, getVisibleUsers);

// ==========================================
// ADMIN ROUTES (admin/super_admin only)
// ==========================================

// GET /api/users/admin/all - Get all users with optional filters & pagination (ADMIN)
router.get("/admin/all", authenticateToken, isAdmin, getAllUsers);

// POST /api/users/admin/update/:id - Update any user by ID (ADMIN)
router.post("/admin/update/:id", authenticateToken, isAdmin, adminUpdateUser);

export default router;
