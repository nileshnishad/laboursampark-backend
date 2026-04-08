import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      enum: ["payu"],
      default: "payu",
      index: true,
    },
    txnId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    receipt: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      default: "general",
      trim: true,
    },
    productInfo: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["created", "pending", "success", "failed", "cancelled", "expired"],
      default: "created",
      index: true,
    },
    payuStatus: {
      type: String,
      trim: true,
    },
    paymentUrlToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    checkoutExpiresAt: {
      type: Date,
      index: true,
    },
    paidAt: Date,

    customer: {
      firstName: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },

    frontendRedirects: {
      successUrl: String,
      failureUrl: String,
    },

    hashValidated: {
      type: Boolean,
      default: false,
    },
    gatewayVerified: {
      type: Boolean,
      default: false,
    },
    verificationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    payuResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorDetails: {
      code: String,
      description: String,
      reason: String,
      metadata: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;