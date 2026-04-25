
import * as msg91Service from "../utils/msg91Service.js";

export const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number required" });
    }

    const response = await msg91Service.sendOtp(mobile);

    res.status(200).json({
      message: "OTP sent successfully",
      data: response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to send OTP",
      error: error.message
    });
  }
};

export const sendSms = async (req, res) => {
  try {
    const { mobile, message } = req.body;

    if (!mobile || !message) {
      return res.status(400).json({ message: "Mobile number and message required" });
    }

    const response = await msg91Service.sendSms(mobile, message);

    console.log("response",response);
    

    res.status(200).json({
      message: "SMS sent successfully",
      data: response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to send SMS",
      error: error.message
    });
  }
};