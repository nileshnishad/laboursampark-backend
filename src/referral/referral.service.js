import User from "../models/User.js";
import ReferralReward from "./referralReward.model.js";
import WalletTransaction from "./walletTransaction.model.js";

export const REFERRAL_WINDOW_HOURS = 72;
export const REFERRAL_REWARD_AMOUNT = 50;

const HOUR_MS = 60 * 60 * 1000;

export const getReferralExpiryTime = (registrationTime) =>
  new Date(new Date(registrationTime).getTime() + REFERRAL_WINDOW_HOURS * HOUR_MS);

export const syncReferralWindowState = async (user) => {
  if (!user) return user;

  // Restore users expired by the previous 72-hour policy.
  if (user.referralStatus === "EXPIRED" && !user.referredByUserId) {
    user.referralStatus = "PENDING";
    user.referralCodeLocked = false;
    await user.save();
  }

  return user;
};

/**
 * Runs every rule from the flow diagram's "System Validations" box, without
 * mutating anything. Used by both the validate and apply endpoints.
 */
export const evaluateReferralCode = async (currentUser, rawCode) => {
  const code = String(rawCode || "").trim().toUpperCase();

  if (!code) {
    return { eligible: false, reason: "Referral code is required" };
  }

  await syncReferralWindowState(currentUser);

  if (currentUser.referralCodeLocked || currentUser.referralStatus !== "PENDING") {
    return {
      eligible: false,
      reason:
        currentUser.referralStatus === "REFERRED"
          ? "A referral code has already been applied to this account"
          : "Referral window has expired for this account",
    };
  }

  const referrer = await User.findOne({ userCode: code }).select(
    "fullName userCode userType mobile",
  );

  if (!referrer) {
    return { eligible: false, reason: "Invalid referral code" };
  }

  if (String(referrer._id) === String(currentUser._id)) {
    return { eligible: false, reason: "Self-referral is not allowed" };
  }

  return {
    eligible: true,
    referrer: {
      userId: referrer._id,
      fullName: referrer.fullName,
      userCode: referrer.userCode,
      userType: referrer.userType,
      mobile: referrer.mobile,
    },
  };
};

export const applyReferralCode = async (currentUser, rawCode) => {
  const evaluation = await evaluateReferralCode(currentUser, rawCode);

  if (!evaluation.eligible) {
    const error = new Error(evaluation.reason);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  currentUser.referredByUserId = evaluation.referrer.userId;
  currentUser.referralStatus = "REFERRED";
  currentUser.referralCodeLocked = true;
  currentUser.referralCodeEnteredAt = now;
  await currentUser.save();

  return evaluation.referrer;
};

export const getReferralStatusView = async (user) => {
  await syncReferralWindowState(user);

  const populated = user.referredByUserId
    ? await User.findById(user.referredByUserId).select("fullName userCode userType")
    : null;

  return {
    referralStatus: user.referralStatus,
    referralCodeLocked: user.referralCodeLocked,
    referralCodeEnteredAt: user.referralCodeEnteredAt || null,
    referralExpiryTime: null,
    referredBy: populated
      ? {
          userId: populated._id,
          fullName: populated.fullName,
          userCode: populated.userCode,
          userType: populated.userType,
        }
      : null,
  };
};

const creditWallet = async ({ userId, amount, referenceId, description }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true },
  ).select("walletBalance");

  await WalletTransaction.create({
    userId,
    type: "credit",
    amount,
    balanceAfter: user?.walletBalance || 0,
    referenceType: "referral_reward",
    referenceId,
    description,
  });

  return user?.walletBalance || 0;
};

const debitWallet = async ({ userId, amount, referenceId, description }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: -amount } },
    { new: true },
  ).select("walletBalance");

  await WalletTransaction.create({
    userId,
    type: "debit",
    amount,
    balanceAfter: user?.walletBalance || 0,
    referenceType: "referral_reward_reversal",
    referenceId,
    description,
  });

  return user?.walletBalance || 0;
};

/**
 * Backend Checks from the flow diagram. Called after a payment turns
 * "success" (subscription purchase). Idempotent: a referred user can only
 * ever produce one reward record.
 */
export const processReferralRewardForPayment = async (payment) => {
  if (!payment?.userId) return null;

  const existingReward = await ReferralReward.findOne({ referredUserId: payment.userId });
  if (existingReward) {
    return existingReward;
  }

  const referredUser = await User.findById(payment.userId);
  if (!referredUser) return null;

  const gate = {
    paymentSuccess: payment.status === "success",
    hasReferrer: Boolean(referredUser.referredByUserId),
    referralStatusOk: referredUser.referralStatus === "REFERRED",
    notSelfReferral:
      !referredUser.referredByUserId ||
      String(referredUser.referredByUserId) !== String(referredUser._id),
  };

  const paidAt = payment.paidAt || new Date();
  const registeredAt = referredUser.createdAt;
  gate.withinWindow =
    Boolean(registeredAt) && paidAt.getTime() - new Date(registeredAt).getTime() <= REFERRAL_WINDOW_HOURS * HOUR_MS;

  const failedCheck = Object.entries(gate).find(([, passed]) => !passed);

  if (failedCheck || !referredUser.referredByUserId) {
    return ReferralReward.create({
      referrerUserId: referredUser.referredByUserId || referredUser._id,
      referredUserId: referredUser._id,
      referralCode: "",
      paymentId: payment._id,
      amount: REFERRAL_REWARD_AMOUNT,
      status: "NOT_ELIGIBLE",
      notEligibleReason: failedCheck ? failedCheck[0] : "no_referrer",
    });
  }

  const referrer = await User.findById(referredUser.referredByUserId).select("userCode");

  const reward = await ReferralReward.create({
    referrerUserId: referredUser.referredByUserId,
    referredUserId: referredUser._id,
    referralCode: referrer?.userCode || "",
    paymentId: payment._id,
    amount: REFERRAL_REWARD_AMOUNT,
    status: "CREDITED",
    creditedAt: new Date(),
  });

  await creditWallet({
    userId: referredUser.referredByUserId,
    amount: REFERRAL_REWARD_AMOUNT,
    referenceId: reward._id,
    description: `Referral reward for referring ${referredUser.fullName || referredUser.userCode}`,
  });

  return reward;
};

/**
 * Manual reversal path for "payment refunded -> ₹50 reversed".
 */
export const reverseReferralRewardForPayment = async (paymentId) => {
  const reward = await ReferralReward.findOne({ paymentId, status: "CREDITED" });
  if (!reward) {
    const error = new Error("No credited referral reward found for this payment");
    error.statusCode = 404;
    throw error;
  }

  reward.status = "REVERSED";
  reward.reversedAt = new Date();
  await reward.save();

  await debitWallet({
    userId: reward.referrerUserId,
    amount: reward.amount,
    referenceId: reward._id,
    description: "Referral reward reversed due to payment refund",
  });

  return reward;
};

export const getReferralHistoryForReferrer = async (referrerUserId, { page = 1, limit = 20 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);

  const [referredUsers, total] = await Promise.all([
    User.find({ referredByUserId: referrerUserId })
      .select("fullName userCode userType referralStatus referralCodeEnteredAt createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments({ referredByUserId: referrerUserId }),
  ]);

  const rewards = await ReferralReward.find({
    referrerUserId,
    referredUserId: { $in: referredUsers.map((u) => u._id) },
  }).lean();

  const rewardByReferredUser = new Map(rewards.map((r) => [String(r.referredUserId), r]));

  const data = referredUsers.map((u) => ({
    userId: u._id,
    fullName: u.fullName,
    userType: u.userType,
    referralStatus: u.referralStatus,
    registeredAt: u.createdAt,
    referralCodeEnteredAt: u.referralCodeEnteredAt || null,
    rewardStatus: rewardByReferredUser.get(String(u._id))?.status || "NOT_ELIGIBLE",
    rewardAmount: rewardByReferredUser.get(String(u._id))?.amount || 0,
    creditedAt: rewardByReferredUser.get(String(u._id))?.creditedAt || null,
  }));

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

export const getWalletHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total, user] = await Promise.all([
    WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    WalletTransaction.countDocuments({ userId }),
    User.findById(userId).select("walletBalance"),
  ]);

  return {
    walletBalance: user?.walletBalance || 0,
    data: transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};
