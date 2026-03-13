import mongoose from "mongoose";
import UserReview from "../models/UserReview.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { logActivity } from "../utils/activityLogger.js";

// ==========================================
// 📝 SUBMIT USER REVIEW (after job completion)
// ==========================================

export const submitUserReview = async (req, res) => {
  try {
    const reviewedBy = req.user.userId;
    const { jobId, userId, rating, feedback, ratingDetails, attachments } = req.body;

    // Validation
    if (!jobId || !userId) {
      return res.status(400).json({
        success: false,
        message: "jobId and userId are required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (!feedback || feedback.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be at least 10 characters long",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid jobId or userId format",
      });
    }

    // Check if job exists
    const job = await Job.findById(jobId).populate("createdBy");
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if job is completed
    if (job.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review completed jobs",
      });
    }

    // Cannot review yourself
    if (reviewedBy === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot review yourself",
      });
    }

    // Check if reviewer is involved in the job (either creator or selected worker)
    const isJobCreator = job.createdBy._id.toString() === reviewedBy;
    const isSelectedWorker = job.selectedWorkers.some((w) =>
      w.workerId.toString() === reviewedBy
    );

    if (!isJobCreator && !isSelectedWorker) {
      return res.status(403).json({
        success: false,
        message: "You are not involved in this job",
      });
    }

    const isRecipientCreator = job.createdBy._id.toString() === userId;
    const isRecipientSelectedWorker = job.selectedWorkers.some(
      (w) => w.workerId.toString() === userId
    );

    // Only creator <-> selected worker reviews are allowed for a given job
    if (isJobCreator && !isRecipientSelectedWorker) {
      return res.status(400).json({
        success: false,
        message: "Contractor can review only selected worker(s) of this job",
      });
    }

    if (isSelectedWorker && !isRecipientCreator) {
      return res.status(400).json({
        success: false,
        message: "Worker can review only the job creator for this job",
      });
    }

    // Check if already reviewed
    const existingReview = await UserReview.findOne({
      jobId,
      userId,
      reviewedBy,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this user for this job",
      });
    }

    // Get reviewer and recipient details
    const reviewer = await User.findById(reviewedBy);
    const recipient = await User.findById(userId);

    if (!reviewer || !recipient) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Determine review type
    const reviewType = isJobCreator ? "contractor_review" : "worker_review";

    // Create review
    const review = new UserReview({
      jobId,
      userId,
      reviewedBy,
      rating,
      feedback,
      ratingDetails: ratingDetails || {},
      attachments: attachments || [],
      reviewType,
      isVerified: true,
      jobDetails: {
        workTitle: job.workTitle,
        estimatedBudget: job.estimatedBudget,
        completedAt: job.completedAt,
      },
      reviewerDetails: {
        name: reviewer.fullName,
        userType: reviewer.userType,
        profilePhotoUrl: reviewer.profilePhotoUrl,
      },
      recipientDetails: {
        name: recipient.fullName,
        userType: recipient.userType,
        rating: recipient.rating || 0,
      },
    });

    await review.save();

    // Update recipient's rating - calculate new average
    const allReviews = await UserReview.find({ userId });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    // Update user with new rating
    await User.findByIdAndUpdate(
      userId,
      {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: allReviews.length,
      },
      { new: true }
    );

    // Log activity
    logActivity(
      reviewedBy,
      "review_submitted",
      review._id,
      "UserReview",
      `Submitted review for user: ${recipient.fullName}`,
      {
        rating,
        jobTitle: job.workTitle,
        reviewType,
      },
      req
    ).catch((err) => console.error("Activity logging error:", err));

    // Populate and return
    await review.populate("userId", "fullName profilePhotoUrl");
    await review.populate("reviewedBy", "fullName profilePhotoUrl");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
      userUpdated: {
        rating: averageRating,
        totalReviews: allReviews.length,
      },
    });
  } catch (error) {
    console.error("Submit review error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while submitting review",
      error: error.message,
    });
  }
};

// ==========================================
// 📖 GET USER REVIEWS (all reviews for a user)
// ==========================================

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt" } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const skip = (page - 1) * limit;

    // Get user
    const user = await User.findById(userId).select(
      "fullName profilePhotoUrl userType rating totalReviews"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get all reviews for this user
    const reviews = await UserReview.find({ userId })
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId", "workTitle")
      .populate("reviewedBy", "fullName profilePhotoUrl userType");

    const total = await UserReview.countDocuments({ userId });

    // Calculate statistics
    const stats = await UserReview.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          avgWorkQuality: { $avg: "$ratingDetails.workQuality" },
          avgCommunication: { $avg: "$ratingDetails.communication" },
          avgTimeliness: { $avg: "$ratingDetails.timeliness" },
          avgProfessionalism: { $avg: "$ratingDetails.professionalism" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "User reviews fetched successfully",
      data: {
        user,
        reviews,
        statistics: stats.length > 0 ? stats[0] : null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching reviews",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 GET JOB REVIEWS (all reviews for a job)
// ==========================================

export const getJobReviews = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const skip = (page - 1) * limit;

    // Get job
    const job = await Job.findById(jobId)
      .select("workTitle estimatedBudget")
      .populate("createdBy", "fullName");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Get all reviews for this job
    const reviews = await UserReview.find({ jobId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "fullName profilePhotoUrl rating")
      .populate("reviewedBy", "fullName profilePhotoUrl userType");

    const total = await UserReview.countDocuments({ jobId });

    res.status(200).json({
      success: true,
      message: "Job reviews fetched successfully",
      data: {
        job,
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get job reviews error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching reviews",
      error: error.message,
    });
  }
};

// ==========================================
// ⭐ GET REVIEW BY ID
// ==========================================

export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format",
      });
    }

    const review = await UserReview.findById(reviewId)
      .populate("userId", "fullName profilePhotoUrl rating")
      .populate("reviewedBy", "fullName profilePhotoUrl userType")
      .populate("jobId", "workTitle estimatedBudget");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Review fetched successfully",
      data: review,
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching review",
      error: error.message,
    });
  }
};

// ==========================================
// 👍 MARK REVIEW AS HELPFUL
// ==========================================

export const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format",
      });
    }

    const review = await UserReview.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Review marked as helpful",
      data: review,
    });
  } catch (error) {
    console.error("Mark helpful error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

// ==========================================
// 🗑️ DELETE REVIEW (by reviewer only)
// ==========================================

export const deleteReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;

    if (!reviewId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format",
      });
    }

    const review = await UserReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only reviewer can delete
    if (review.reviewedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    await UserReview.findByIdAndDelete(reviewId);

    // Recalculate recipient's rating
    const remainingReviews = await UserReview.find({ userId: review.userId });
    const totalRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating =
      remainingReviews.length > 0 ? totalRating / remainingReviews.length : 0;

    // Update user
    await User.findByIdAndUpdate(
      review.userId,
      {
        rating: Math.round(averageRating * 10) / 10,
        totalReviews: remainingReviews.length,
      }
    );

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting review",
      error: error.message,
    });
  }
};

// ==========================================
// 📈 GET USER RATING DETAILS
// ==========================================

export const getUserRatingDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId).select(
      "fullName rating totalReviews profilePhotoUrl userType"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get detailed statistics
    const stats = await UserReview.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          oneStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
          twoStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          threeStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          fourStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          avgWorkQuality: { $avg: "$ratingDetails.workQuality" },
          avgCommunication: { $avg: "$ratingDetails.communication" },
          avgTimeliness: { $avg: "$ratingDetails.timeliness" },
          avgProfessionalism: { $avg: "$ratingDetails.professionalism" },
        },
      },
    ]);

    // Get recent reviews
    const recentReviews = await UserReview.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reviewedBy", "fullName profilePhotoUrl");

    res.status(200).json({
      success: true,
      message: "User rating details fetched successfully",
      data: {
        user,
        statistics: stats.length > 0 ? stats[0] : null,
        recentReviews,
      },
    });
  } catch (error) {
    console.error("Get rating details error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};
