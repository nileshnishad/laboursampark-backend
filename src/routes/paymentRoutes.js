import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createCheckout,
  verifyPayment,
  markPaymentFailure,
  getPaymentHistory,
  getPaymentDetails,
} from "../controllers/paymentController.js";

const router = express.Router();

// Create Razorpay order for checkout
router.post("/checkout", authenticateToken, createCheckout);

// Verify payment after frontend gets Razorpay success response
router.post("/verify", authenticateToken, verifyPayment);

// Save failed/cancelled/expired payment attempts
router.post("/failure", authenticateToken, markPaymentFailure);

// Get authenticated user's payment history
router.get("/history", authenticateToken, getPaymentHistory);

// Get a single payment details
router.get("/history/:paymentId", authenticateToken, getPaymentDetails);

export default router;