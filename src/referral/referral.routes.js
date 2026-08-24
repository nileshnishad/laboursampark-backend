import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  getReferralDetails,
  validateReferralCode,
  applyReferral,
  getReferralStatus,
  getReferralHistory,
  getWalletTransactions,
  reprocessPaymentReward,
  reverseReward,
} from "./referral.controller.js";

const router = express.Router();

// ==========================================
// PROTECTED ROUTES (authenticated user)
// ==========================================

// GET /api/referrals/my-code - Get own referral code, share link & stats
router.get("/my-code", authenticateToken, getReferralDetails);

// POST /api/referrals/validate - Validate a referral code before applying
router.post("/validate", authenticateToken, validateReferralCode);

// POST /api/referrals/apply - Apply/lock a referral code (one-time only)
router.post("/apply", authenticateToken, applyReferral);

// GET /api/referrals/status - Current user's own referral status
router.get("/status", authenticateToken, getReferralStatus);

// GET /api/referrals/history - Referral history as a referrer
router.get("/history", authenticateToken, getReferralHistory);

// GET /api/referrals/wallet - Wallet balance & referral reward transactions
router.get("/wallet", authenticateToken, getWalletTransactions);

// ==========================================
// ADMIN ROUTES (manual payment webhook reprocess / refund reversal)
// ==========================================

// POST /api/referrals/admin/process/:paymentId - Manually (re)process reward for a payment
router.post("/admin/process/:paymentId", authenticateToken, isAdmin, reprocessPaymentReward);

// POST /api/referrals/admin/reverse/:paymentId - Reverse a credited reward (refund case)
router.post("/admin/reverse/:paymentId", authenticateToken, isAdmin, reverseReward);

export default router;
