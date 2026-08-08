import mongoose from "mongoose";

const ticketAttachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, default: 0 },
    data: { type: String, default: "" },
    storageType: { type: String, default: "base64" },
  },
  { _id: false }
);

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
    attachments: [ticketAttachmentSchema],
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
