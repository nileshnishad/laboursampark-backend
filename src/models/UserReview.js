import mongoose from "mongoose";

const userReviewSchema = new mongoose.Schema(
  {
    // The job related to this review
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    // User being reviewed
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // User who is giving the review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Rating out of 5
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    // Review text
    feedback: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },

    // Detailed ratings for different aspects
    ratingDetails: {
      workQuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    // Review type: CONTRACTOR_REVIEWS_LABOUR or LABOUR_REVIEWS_CONTRACTOR
    reviewType: {
      type: String,
      enum: ["worker_review", "contractor_review"],
      required: true,
    },

    // Photos/attachments
    attachments: [
      {
        url: String,
        type: String, // image, document
      },
    ],

    // Is verified (actually completed work)
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Helpful count
    helpfulCount: {
      type: Number,
      default: 0,
    },

    // Job details snapshot
    jobDetails: {
      workTitle: String,
      estimatedBudget: Number,
      completedAt: Date,
    },

    // Reviewer details snapshot
    reviewerDetails: {
      name: String,
      userType: String,
      profilePhotoUrl: String,
    },

    // Recipient details snapshot
    recipientDetails: {
      name: String,
      userType: String,
      rating: Number, // rating at time of review
    },
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, createdAt: -1 },
      { reviewedBy: 1, createdAt: -1 },
      { jobId: 1 },
      { userId: 1, "ratingDetails.workQuality": -1 },
    ],
  }
);

// Prevent duplicate reviews - one person can only review another once per job
userReviewSchema.index({ jobId: 1, userId: 1, reviewedBy: 1 }, { unique: true });

// Virtual for average rating of all rating details
userReviewSchema.virtual("averageDetailedRating").get(function () {
  const { workQuality, communication, timeliness, professionalism } =
    this.ratingDetails || {};
  const ratings = [workQuality, communication, timeliness, professionalism].filter(
    (r) => r !== undefined
  );
  if (ratings.length === 0) return this.rating;
  return Math.round((ratings.reduce((a, b) => a + b) / ratings.length) * 10) / 10;
});

export default mongoose.model("UserReview", userReviewSchema);
