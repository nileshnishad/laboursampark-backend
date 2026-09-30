import mongoose from "mongoose";

const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  provider: { type: String, enum: ["cashfree-payment", "cashfree-payout"], required: true },
  eventType: { type: String, trim: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  processedAt: Date,
}, { timestamps: true });

export default mongoose.model("CashfreeWebhookEvent", schema);