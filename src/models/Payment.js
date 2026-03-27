import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    purpose: {
      type: String,
      default: "general",
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    receipt: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["created", "success", "failed", "expired", "cancelled"],
      default: "created",
      index: true,
    },

    razorpayOrderId: {
      type: String,
      index: true,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
      trim: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },

    checkoutExpiresAt: {
      type: Date,
      index: true,
    },
    paidAt: Date,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    gatewayPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorDetails: {
      code: String,
      description: String,
      source: String,
      step: String,
      reason: String,
      metadata: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;