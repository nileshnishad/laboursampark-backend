import mongoose from "mongoose";

// One reward ledger row per referred user (User B). Enforced unique so a
// referred user can only ever produce a single reward outcome for User A.
const referralRewardSchema = new mongoose.Schema(
  {
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    amount: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ["NOT_ELIGIBLE", "PENDING", "CREDITED", "REVERSED"],
      default: "PENDING",
      index: true,
    },
    notEligibleReason: String,
    creditedAt: Date,
    reversedAt: Date,

    // Real-money payout to the referrer. Separate from `status` (in-app
    // wallet ledger) because PayU Payout isn't wired in yet — until then
    // this stays "PENDING" for admins to settle manually, then switches to
    // "PAID". `payoutMethod` flips to "payu_payout" once that service is live.
    payoutStatus: {
      type: String,
      enum: ["NOT_APPLICABLE", "PENDING", "PAID"],
      default: "NOT_APPLICABLE",
      index: true,
    },
    payoutMethod: {
      type: String,
      enum: ["manual", "payu_payout"],
      default: "manual",
    },
    payoutReference: String,
    payoutNotes: String,
    payoutPaidAt: Date,
    // Set when a reward is reversed (refund) after its payout was already
    // paid out manually — flags that the ₹50 needs to be recovered outside the app.
    recoveryRequired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const ReferralReward = mongoose.model("ReferralReward", referralRewardSchema);

export default ReferralReward;
