import User from "../models/User.js";
import Payment from "../models/Payment.js";
import ReferralReward from "./referralReward.model.js";
import {
  evaluateReferralCode,
  applyReferralCode,
  getReferralStatusView,
  getReferralHistoryForReferrer,
  getWalletHistory,
  processReferralRewardForPayment,
  reverseReferralRewardForPayment,
  getReferralExpiryTime,
  REFERRAL_REWARD_AMOUNT,
} from "./referral.service.js";

// ==========================================
// 1) GET REFERRAL DETAILS (own shareable code)
// ==========================================
export const getReferralDetails = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "fullName userCode referralStatus createdAt",
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.userCode) {
      return res.status(400).json({
        success: false,
        message: "Referral code is not available yet for this account",
      });
    }

    const [totalReferred, credited, pending] = await Promise.all([
      User.countDocuments({ referredByUserId: user._id }),
      ReferralReward.countDocuments({ referrerUserId: user._id, status: "CREDITED" }),
      ReferralReward.countDocuments({ referrerUserId: user._id, status: "PENDING" }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Referral details fetched successfully",
      data: {
        referralCode: user.userCode,
        shareLink: `https://laboursampark.com/ref/${user.userCode}`,
        rewardPerReferral: REFERRAL_REWARD_AMOUNT,
        totalReferred,
        creditedRewards: credited,
        pendingRewards: pending,
      },
    });
  } catch (error) {
    console.error("Get referral details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referral details",
      error: error.message,
    });
  }
};

// ==========================================
// 2) VALIDATE REFERRAL CODE
// ==========================================
export const validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const evaluation = await evaluateReferralCode(user, referralCode);

    return res.status(200).json({
      success: true,
      message: evaluation.eligible ? "Referral code is valid" : "Referral code is not valid",
      data: evaluation,
    });
  } catch (error) {
    console.error("Validate referral code error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate referral code",
      error: error.message,
    });
  }
};

// ==========================================
// 3) APPLY / LOCK REFERRAL CODE
// ==========================================
export const applyReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ success: false, message: "referralCode is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referrer = await applyReferralCode(user, referralCode);

    return res.status(200).json({
      success: true,
      message: "Referral code applied successfully",
      data: {
        referralStatus: user.referralStatus,
        referralCodeLocked: user.referralCodeLocked,
        referralCodeEnteredAt: user.referralCodeEnteredAt,
        referredBy: referrer,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Apply referral code error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply referral code",
      error: error.message,
    });
  }
};

// ==========================================
// 4) REFERRAL STATUS (for the referred user / User B)
// ==========================================
export const getReferralStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const statusView = await getReferralStatusView(user);

    return res.status(200).json({
      success: true,
      message: "Referral status fetched successfully",
      data: statusView,
    });
  } catch (error) {
    console.error("Get referral status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referral status",
      error: error.message,
    });
  }
};

// ==========================================
// 5) REFERRAL HISTORY (as referrer / User A)
// ==========================================
export const getReferralHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getReferralHistoryForReferrer(req.userId, { page, limit });

    return res.status(200).json({
      success: true,
      message: "Referral history fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get referral history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referral history",
      error: error.message,
    });
  }
};

// ==========================================
// 6) PAYMENT WEBHOOK HOOK (admin retry / manual reprocess)
// ==========================================
// The real-time trigger runs automatically inside the existing PayU success
// callback (see src/controllers/paymentController.js -> applyPostPaymentBenefits).
// These endpoints exist for admin-triggered reprocessing/reversal only.
export const reprocessPaymentReward = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const reward = await processReferralRewardForPayment(payment);

    return res.status(200).json({
      success: true,
      message: "Referral reward processed",
      data: reward,
    });
  } catch (error) {
    console.error("Reprocess referral reward error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reprocess referral reward",
      error: error.message,
    });
  }
};

export const reverseReward = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const reward = await reverseReferralRewardForPayment(paymentId);

    return res.status(200).json({
      success: true,
      message: "Referral reward reversed",
      data: reward,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Reverse referral reward error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reverse referral reward",
      error: error.message,
    });
  }
};

// ==========================================
// 7) WALLET TRANSACTIONS (optional ledger for the ₹50 rewards)
// ==========================================
export const getWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getWalletHistory(req.userId, { page, limit });

    return res.status(200).json({
      success: true,
      message: "Wallet transactions fetched successfully",
      data: {
        walletBalance: result.walletBalance,
        transactions: result.data,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get wallet transactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet transactions",
      error: error.message,
    });
  }
};

export { getReferralExpiryTime };
