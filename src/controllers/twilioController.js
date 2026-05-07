import { sendVerificationCode } from "../utils/twilio/verifyService.js";
import { checkVerificationCode } from "../utils/twilio/verifyService.js";
import { sendTwilioSms } from "../utils/twilio/verifyService.js";
import User from "../models/User.js";
import { TWILIO_MESSAGING_SERVICE_SID } from "../utils/twilio/twilioConfig.js";

const normalizeIndianPhone = (value) => {
  const rawPhone = String(value || "").trim();
  const digitsOnly = rawPhone.replace(/\D/g, "");
  let tenDigitIndianNumber = null;

  if (digitsOnly.length === 10) {
    tenDigitIndianNumber = digitsOnly;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    tenDigitIndianNumber = digitsOnly.slice(2);
  }

  const normalizedPhone = tenDigitIndianNumber
    ? `+91${tenDigitIndianNumber}`
    : rawPhone;

  const mobileCandidates = Array.from(
    new Set(
      [
        rawPhone,
        normalizedPhone,
        tenDigitIndianNumber,
        tenDigitIndianNumber ? `91${tenDigitIndianNumber}` : null,
      ].filter(Boolean)
    )
  );

  return { rawPhone, normalizedPhone, mobileCandidates };
};

export const sendTwilioVerification = async (req, res) => {
  try {
    const { to, userId } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: "'to' (phone number) is required" });
    }

    const { normalizedPhone, mobileCandidates } = normalizeIndianPhone(to);

    const duplicateFilter = {
      mobile: { $in: mobileCandidates },
    };

    if (userId) {
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId format",
        });
      }
      duplicateFilter._id = { $ne: userId };
    }

    const existingUser = await User.findOne(duplicateFilter).select("_id fullName mobile");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "This mobile number is already linked to another account. Kindly verify and use a different number.",
      });
    }

    if (userId) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            mobile: normalizedPhone,
            OTPstatus: "inactive",
            mobileVerified: false,
          },
        },
        { new: true }
      ).select("_id mobile");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found for the provided userId",
        });
      }
    }

    const result = await sendVerificationCode(normalizedPhone);
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
    const { normalizedPhone, mobileCandidates } = normalizeIndianPhone(to);
    console.log("[verifyTwilioOtp] Received to:", to, "code:", code);
    const result = await checkVerificationCode(normalizedPhone, code);
    console.log("[verifyTwilioOtp] Twilio result:", result);
    // If OTP is valid and approved, update user OTPstatus
    if (result && result.status === "approved" && result.valid) {
      console.log("[verifyTwilioOtp] Looking for user with mobile candidates:", mobileCandidates);
      const updateResult = await User.findOneAndUpdate(
        { mobile: { $in: mobileCandidates } },
        { OTPstatus: "active", mobileVerified: true, mobile: normalizedPhone },
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
