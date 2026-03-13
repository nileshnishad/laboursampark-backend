import mongoose from "mongoose";

const userJobHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobEnquiry",
      required: true,
      unique: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["applied", "accepted", "rejected", "withdrawn", "completed"],
      default: "applied",
      index: true,
    },

    // Job details snapshot at time of application
    jobDetails: {
      workTitle: String,
      description: String,
      workType: String,
      location: {
        city: String,
        state: String,
        area: String,
      },
      estimatedBudget: Number,
      requiredSkills: [String],
      workersNeeded: Number,
      target: [String],
    },

    // User details snapshot at time of application
    userDetails: {
      name: String,
      mobile: String,
      email: String,
      userType: String,
      skills: [String],
      experience: String,
      rating: Number,
      profilePhotoUrl: String,
    },

    // Application message/note
    applicationMessage: String,

    // Timeline - when did what happen
    timeline: {
      appliedAt: {
        type: Date,
        default: Date.now,
      },
      acceptedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
      withdrawnAt: Date,
      completedAt: Date,
    },

    // Additional info
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,

    // For analytics
    daysSinceApplied: Number, // Calculated field for queries
  },
  {
    timestamps: true, // createdAt, updatedAt
    indexes: [
      { userId: 1, createdAt: -1 },
      { jobId: 1, status: 1 },
      { userId: 1, status: 1 },
      { postedBy: 1, userId: 1 },
    ],
  }
);

// Virtual for calculating days since applied
userJobHistorySchema.virtual("daysElapsed").get(function () {
  if (this.timeline.appliedAt) {
    const days = Math.floor(
      (Date.now() - this.timeline.appliedAt) / (1000 * 60 * 60 * 24)
    );
    return days;
  }
  return 0;
});

// Pre-save hook to ensure isActive is false if status changes
userJobHistorySchema.pre("save", async function () {
  if (this.status === "withdrawn" || this.status === "rejected") {
    this.isActive = false;
  }
});

export default mongoose.model("UserJobHistory", userJobHistorySchema);
