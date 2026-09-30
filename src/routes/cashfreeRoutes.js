import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import { createCashfreeOrder, verifyCashfreePayment, handleCashfreePaymentWebhook, createCashfreeRefund, getCashfreeRefund, createCashfreeBeneficiary, getCashfreeBeneficiary, removeCashfreeBeneficiary, createCashfreePayout, getCashfreePayout, handleCashfreePayoutWebhook, retryCashfreePayout, listCashfreePayouts } from "../controllers/cashfreeController.js";

const router = express.Router();
router.post("/webhooks/payment", handleCashfreePaymentWebhook);
router.post("/webhooks/payout", handleCashfreePayoutWebhook);
router.post("/orders", authenticateToken, createCashfreeOrder);
router.get("/orders/:paymentId/status", authenticateToken, verifyCashfreePayment);
router.post("/payments/:paymentId/refund", authenticateToken, isAdmin, createCashfreeRefund);
router.get("/payments/:paymentId/refund", authenticateToken, isAdmin, getCashfreeRefund);
router.post("/beneficiaries", authenticateToken, createCashfreeBeneficiary);
router.get("/beneficiaries/:beneficiaryId", authenticateToken, getCashfreeBeneficiary);
router.delete("/beneficiaries/:beneficiaryId", authenticateToken, removeCashfreeBeneficiary);
router.post("/payouts", authenticateToken, isAdmin, createCashfreePayout);
router.get("/payouts", authenticateToken, isAdmin, listCashfreePayouts);
router.get("/payouts/:payoutId", authenticateToken, isAdmin, getCashfreePayout);
router.post("/payouts/:payoutId/retry", authenticateToken, isAdmin, retryCashfreePayout);
export default router;