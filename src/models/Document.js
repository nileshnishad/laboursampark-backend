import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    // Reference to the user who uploaded the document
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Document Information
    documentType: {
      type: String,
      enum: [
        "aadhar",
        "pan",
        "passport",
        "driving_license",
        "gst_certificate",
        "business_registration",
        "insurance",
        "certificate",
        "qualification",
        "experience_letter",
        "bank_statement",
        "other",
      ],
      required: true,
    },

    documentName: {
      type: String,
      required: true,
    },

    documentUrl: {
      type: String,
      required: true,
    },

    // Cloudinary or storage reference
    publicId: {
      type: String,
    },

    // Document Details
    fileSize: Number, // in bytes
    fileType: String, // e.g., pdf, jpg, png
    duration: Number, // in seconds if video/audio

    // Verification Status
    verified: {
      type: Boolean,
      default: false,
    },

    verificationNotes: String,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin or verifier
    },

    verifiedAt: Date,

    // Additional Info
    expiryDate: Date,
    issueDate: Date,
    issuingAuthority: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },

    rejectionReason: String,
  },
  {
    timestamps: true,
  }
);

// Index for user documents
documentSchema.index({ userId: 1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ status: 1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;
