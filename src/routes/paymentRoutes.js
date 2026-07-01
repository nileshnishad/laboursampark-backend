import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  createPayUCheckoutLink,
  openPayUCheckout,
  handlePayUSuccessCallback,
  handlePayUFailureCallback,
  initPayUMobilePayment,
  generatePayUHash,
  getPaymentStatus,
  getPaymentHistory,
  getAllPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// Web flow (unchanged)
router.post("/payu/create-link", authenticateToken, createPayUCheckoutLink);
router.get("/checkout/:token", openPayUCheckout);
router.post("/payu/callback/success", handlePayUSuccessCallback);
router.post("/payu/callback/failure", handlePayUFailureCallback);

// Android / Flutter — returns raw params for native PayU SDK
router.post("/payu/init", authenticateToken, initPayUMobilePayment);

// Android / Flutter — dynamic hash generation for PayU SDK's generateHash callback
router.post("/payu/hash", authenticateToken, generatePayUHash);

router.get("/:paymentId/status", authenticateToken, getPaymentStatus);
router.get("/history", authenticateToken, getPaymentHistory);

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET /api/payments/admin/all - Get all payments with filters & pagination (ADMIN)
router.get("/admin/all", authenticateToken, isAdmin, getAllPayments);

export default router;