import express from "express";
import { sendTwilioVerification } from "../controllers/twilioController.js";
import { verifyTwilioOtp } from "../controllers/twilioController.js";
import { sendTwilioSmsHandler } from "../controllers/twilioController.js";

const router = express.Router();

// POST /api/twilio/send-verification
router.post("/send-verification", sendTwilioVerification);

// POST /api/twilio/verify-otp
router.post("/verify-otp", verifyTwilioOtp);

// POST /api/twilio/send-sms
router.post("/send-sms", sendTwilioSmsHandler);

export default router;
