import { sendVerificationCode } from "../utils/twilio/verifyService.js";
import { checkVerificationCode } from "../utils/twilio/verifyService.js";
import { sendTwilioSms } from "../utils/twilio/verifyService.js";
import User from "../models/User.js";
import { TWILIO_MESSAGING_SERVICE_SID } from "../utils/twilio/twilioConfig.js";

export const sendTwilioVerification = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: "'to' (phone number) is required" });
    }
    const result = await sendVerificationCode(to);
    res.status(200).json({ success: true, message: "Verification code sent", data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send verification code", error });
  }
};

export const verifyTwilioOtp = async (req, res) => {
  try {
    const { to, code } = req.body;
    if (!to || !code) {
      return res.status(400).json({ success: false, message: "'to' (phone number) and 'code' are required" });
    }
    console.log("[verifyTwilioOtp] Received to:", to, "code:", code);
    const result = await checkVerificationCode(to, code);
    console.log("[verifyTwilioOtp] Twilio result:", result);
    // If OTP is valid and approved, update user OTPstatus
    if (result && result.status === "approved" && result.valid) {
      // Format 'to' to E.164 (+91) if needed
     
      console.log("[verifyTwilioOtp] Looking for user with mobile:", to);
      const updateResult = await User.findOneAndUpdate(
        { mobile: to },
        { OTPstatus: "active" },
        { new: true }
      );
      console.log("[verifyTwilioOtp] User update result:", updateResult);
    }
    res.status(200).json({ success: true, message: "OTP verification result", data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to verify OTP", error });
  }
};

export const sendTwilioSmsHandler = async (req, res) => {
  try {
    const { to, body, messagingServiceSid } = req.body;
    const sid = messagingServiceSid || TWILIO_MESSAGING_SERVICE_SID;
    if (!to || !body || !sid) {
      return res.status(400).json({ success: false, message: "'to', 'body', and 'messagingServiceSid' are required (or set in env)" });
    }
    const result = await sendTwilioSms({ to, body, messagingServiceSid: sid });
    res.status(200).json({ success: true, message: "SMS sent", data: result });
  } catch (error) {
    console.error("Twilio SMS error:", error?.response?.data || error.message || error);
    res.status(500).json({ success: false, message: "Failed to send SMS", error });
  }
};
