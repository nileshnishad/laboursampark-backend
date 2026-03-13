import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Recipients
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notificationType: {
      type: String,
      enum: [
        "enquiry_rejected",
        "enquiry_accepted",
        "enquiry_withdrawn",
        "job_applied",
        "job_completed",
        "review_received",
        "message",
        "general",
      ],
      required: true,
    },

    // References
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobEnquiry",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Content
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      jobTitle: String,
      jobBudget: Number,
      rejectionReason: String,
      actionUrl: String,
    },

    // Status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,

    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // Metadata
    actionRequired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ enquiryId: 1 });
notificationSchema.index({ jobId: 1 });
notificationSchema.index({ notificationType: 1 });

export default mongoose.model("Notification", notificationSchema);
