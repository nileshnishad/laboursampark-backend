import mongoose from "mongoose";

const activityHistorySchema = new mongoose.Schema(
  {
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Activity Type
    activityType: {
      type: String,
      enum: [
        "job_created",
        "job_updated",
        "job_deleted",
        "job_completed",
        "job_closed",
        "enquiry_created",
        "enquiry_accepted",
        "enquiry_rejected",
        "enquiry_withdrawn",
        "worker_selected",
        "review_submitted",
        "profile_updated",
        "document_uploaded",
        "password_changed",
        "login",
        "logout",
      ],
      required: true,
    },

    // Related Entity
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedModel",
    },

    // Related Model Type
    relatedModel: {
      type: String,
      enum: ["Job", "JobEnquiry", "User", "Document", "UserReview"],
      default: null,
    },

    // Activity Details
    description: String,
    details: {
      oldValue: mongoose.Schema.Types.Mixed, // For updates
      newValue: mongoose.Schema.Types.Mixed, // For updates
      jobTitle: String,
      enquiryStatus: String,
      workerId: mongoose.Schema.Types.ObjectId,
      workerName: String,
      appliedCount: Number,
    },

    // IP & Device Info
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,

    // Status
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },

    // Error Info (if failed)
    errorMessage: String,

    // Visibility
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
activityHistorySchema.index({ userId: 1, createdAt: -1 });
activityHistorySchema.index({ activityType: 1 });
activityHistorySchema.index({ relatedId: 1 });
activityHistorySchema.index({ createdAt: -1 });
activityHistorySchema.index({ userId: 1, activityType: 1 });

export default mongoose.model("ActivityHistory", activityHistorySchema);
