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
  },
  {
    timestamps: true,
  },
);

const ReferralReward = mongoose.model("ReferralReward", referralRewardSchema);

export default ReferralReward;
