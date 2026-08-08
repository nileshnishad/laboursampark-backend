import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, trim: true, default: "" },
    userEmail: { type: String, trim: true, lowercase: true, default: "" },
    userMobile: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "general" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    attachments: {
      type: [{ type: mongoose.Schema.Types.Mixed }],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    adminNote: { type: String, trim: true, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
