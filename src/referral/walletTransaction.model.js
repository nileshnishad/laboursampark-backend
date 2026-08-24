import mongoose from "mongoose";

// Simple wallet ledger. Optional for other features, but required here to
// record every referral reward credit/reversal against the referrer.
const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      default: "referral_reward",
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    description: String,
  },
  {
    timestamps: true,
  },
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);

export default WalletTransaction;
