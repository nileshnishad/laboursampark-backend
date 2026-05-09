import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createPayUCheckoutLink,
  openPayUCheckout,
  handlePayUSuccessCallback,
  handlePayUFailureCallback,
  initPayUMobilePayment,
  getPaymentStatus,
  getPaymentHistory,
} from "../controllers/paymentController.js";

const router = express.Router();

// Web flow (unchanged)
router.post("/payu/create-link", authenticateToken, createPayUCheckoutLink);
router.get("/checkout/:token", openPayUCheckout);
router.post("/payu/callback/success", handlePayUSuccessCallback);
router.post("/payu/callback/failure", handlePayUFailureCallback);

// Android / Flutter — returns raw params for native PayU SDK
router.post("/payu/init", authenticateToken, initPayUMobilePayment);

router.get("/:paymentId/status", authenticateToken, getPaymentStatus);
router.get("/history", authenticateToken, getPaymentHistory);

export default router;