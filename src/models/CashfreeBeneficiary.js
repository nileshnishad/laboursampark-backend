import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  beneficiaryId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  bankAccountLast4: { type: String, trim: true },
  bankIfsc: { type: String, trim: true, uppercase: true },
  vpa: { type: String, trim: true },
  status: { type: String, trim: true },
  cashfreeResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

schema.index({ userId: 1, beneficiaryId: 1 }, { unique: true });
export default mongoose.model("CashfreeBeneficiary", schema);