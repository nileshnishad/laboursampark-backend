import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: "CashfreeBeneficiary", required: true },
  transferId: { type: String, required: true, unique: true, index: true },
  cashfreeTransferId: { type: String, trim: true, index: true, sparse: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: "INR", uppercase: true },
  transferMode: { type: String, default: "banktransfer", trim: true },
  status: { type: String, enum: ["created", "pending", "success", "failed", "reversed", "rejected"], default: "created", index: true },
  cashfreeStatus: String,
  failureReason: String,
  cashfreeResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model("CashfreePayout", schema);