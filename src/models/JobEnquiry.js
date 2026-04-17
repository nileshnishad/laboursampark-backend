import mongoose from "mongoose";

const jobEnquirySchema = new mongoose.Schema(
  {
    // References
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // User Information (captured at time of enquiry)
    userDetails: {
      fullName: String,
      email: String,
      mobile: String,
      userType: String, // labour, contractor, sub_contractor
      profilePhotoUrl: String,
      rating: Number,
      totalReviews: Number,
      experience: String,
      skills: [String],
    },

    // Enquiry Details
    message: {
      type: String,
      default: "",
    },
    interest: {
      type: Boolean,
      default: true,
    },

    // Job Details at time of enquiry
    jobDetails: {
      workTitle: String,
      estimatedBudget: Number,
      workersNeeded: Number,
      requiredSkills: [String],
    },

    // Status Management
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn", "completed"],
      default: "pending",
    },
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    completedAt: Date,

    // Communication
    notes: String, // Notes from job poster about this enquiry

    // Metadata
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
jobEnquirySchema.index({ jobId: 1, userId: 1 }, { unique: true }); // Prevent duplicate enquiries
jobEnquirySchema.index({ jobId: 1, status: 1 });
jobEnquirySchema.index({ userId: 1, status: 1 });
jobEnquirySchema.index({ postedBy: 1 });
jobEnquirySchema.index({ createdAt: -1 });

export default mongoose.model("JobEnquiry", jobEnquirySchema);
