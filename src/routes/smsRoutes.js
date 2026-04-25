import express from "express";
const router = express.Router();

import { sendOtp, sendSms } from "../controllers/smsController.js";

// POST /api/sms/send-otp
router.post("/send-otp", sendOtp);

// POST /api/sms/send-sms
router.post("/send-sms", sendSms);

export default router;
