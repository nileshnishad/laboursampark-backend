import JobEnquiry from "../models/JobEnquiry.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import UserJobHistory from "../models/UserJobHistory.js";
import Notification from "../models/Notification.js";
import UserReview from "../models/UserReview.js";
import { logActivity } from "../utils/activityLogger.js";
import { sendEmail } from "../utils/sendEmail.js";
import { jobRejectionTemplate } from "../utils/templates/jobRejectionTemplate.js";
import { jobAcceptanceTemplate } from "../utils/templates/jobAcceptanceTemplate.js";

// ==========================================
// 📧 CREATE JOB ENQUIRY (Apply to Job)
// ==========================================

export const createEnquiry = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;
    const { message } = req.body;

    // Validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    // Get user details
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get job details
    const job = await Job.findById(jobId).populate("createdBy");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Cannot apply to own job
    if (job.createdBy._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own job",
      });
    }

    // Check if user is allowed to apply based on target
    if (!job.target.includes(user.userType)) {
      return res.status(403).json({
        success: false,
        message: `This job is not open for ${user.userType}s`,
      });
    }

    // Check if already enquired
    const existingEnquiry = await JobEnquiry.findOne({
      jobId,
      userId,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingEnquiry) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Create enquiry object
    const enquiry = new JobEnquiry({
      jobId,
      userId,
      postedBy: job.createdBy._id,
      message: message || "",
      userDetails: {
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
        profilePhotoUrl: user.profilePhotoUrl,
        rating: user.rating,
        totalReviews: user.totalReviews,
        experience: user.experience,
        skills: user.skills,
      },
      jobDetails: {
        workTitle: job.workTitle,
        estimatedBudget: job.estimatedBudget,
        workersNeeded: job.workersNeeded,
        requiredSkills: job.requiredSkills,
      },
      status: "pending",
    });

    await enquiry.save();
    console.log("✅ Enquiry saved successfully:", enquiry._id);

    // Create user job history record
    const userJobHistory = new UserJobHistory({
      userId,
      jobId,
      enquiryId: enquiry._id,
      postedBy: job.createdBy._id,
      status: "applied",
      jobDetails: {
        workTitle: job.workTitle,
        description: job.description,
        workType: job.workType,
        location: {
          city: job.location?.city,
          state: job.location?.state,
          area: job.location?.area,
        },
        estimatedBudget: job.estimatedBudget,
        requiredSkills: job.requiredSkills,
        workersNeeded: job.workersNeeded,
        target: job.target,
      },
      userDetails: {
        name: user.fullName,
        mobile: user.mobile,
        email: user.email,
        userType: user.userType,
        skills: user.skills,
        experience: user.experience,
        rating: user.rating,
        profilePhotoUrl: user.profilePhotoUrl,
      },
      applicationMessage: message || "",
      timeline: {
        appliedAt: new Date(),
      },
    });

    await userJobHistory.save();
    console.log("✅ UserJobHistory saved successfully:", userJobHistory._id);

    // Log activity (non-blocking)
    logActivity(
      userId,
      "enquiry_created",
      enquiry._id,
      "JobEnquiry",
      `Applied for job: ${job.workTitle}`,
      {
        jobTitle: job.workTitle,
        jobId: jobId,
        userType: user.userType,
      },
      req
    ).catch(err => console.error("❌ Activity logging error:", err));

    // Populate full user details
    try {
      await enquiry.populate("userId", "fullName email mobile profilePhotoUrl userType rating");
      console.log("✅ Enquiry populated successfully");
    } catch (populateErr) {
      console.error("❌ Error populating enquiry:", populateErr);
      // Continue anyway - we have the enquiry data
    }

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("❌ Create enquiry error:", error.message);
    console.error("Stack:", error.stack);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while submitting enquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 GET JOB ENQUIRIES (for job creator)
// ==========================================

export const getJobEnquiries = async (req, res) => {
  try {
    console.log("getJobEnquiries called");
    const userId = req.userId;
    const { jobId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    // Check if user is job creator
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view enquiries for your own jobs",
      });
    }

    const normalizedStatus = status ? status.toLowerCase() : null;

    // Pagination
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Source-of-truth for completion status is UserJobHistory.
    const historyRecords = await UserJobHistory.find({
      jobId,
      postedBy: userId,
    }).select("enquiryId status timeline.completedAt");

    const historyByEnquiryId = new Map(
      historyRecords
        .filter((item) => item.enquiryId)
        .map((item) => [
          item.enquiryId.toString(),
          {
            status: item.status,
            completedAt: item.timeline?.completedAt || null,
          },
        ])
    );

    // Always fetch all enquiries for this job first, then filter by effective status.
    // This avoids missing records when enquiry.status and history.status diverge.
    const allEnquiries = await JobEnquiry.find({ jobId })
      .populate("userId", "fullName email mobile profilePhotoUrl userType rating totalReviews")
      .sort({ createdAt: -1 });

    const mergedEnquiries = allEnquiries.map((enquiry) => {
      const history = historyByEnquiryId.get(enquiry._id.toString());
      const effectiveStatus = history?.status === "completed" ? "completed" : enquiry.status;

      return {
        ...enquiry.toObject(),
        effectiveStatus,
        jobStatus: job.status,
        completedAt: history?.completedAt || null,
      };
    });

    const statusFiltered = normalizedStatus
      ? mergedEnquiries.filter((item) => item.effectiveStatus === normalizedStatus)
      : mergedEnquiries;

    const total = statusFiltered.length;
    const paginatedEnquiries = statusFiltered.slice(skip, skip + parsedLimit);

    res.status(200).json({
      success: true,
      message: "Job enquiries fetched successfully",
      data: {
        enquiries: paginatedEnquiries,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      },
    });
  } catch (error) {
    console.error("Get job enquiries error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching enquiries",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 GET MY ENQUIRIES (for applicant)
// ==========================================

export const getMyEnquiries = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Build filter
    let filter = { userId };
    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const enquiries = await JobEnquiry.find(filter)
      .populate("jobId", "workTitle estimatedBudget location status")
      .populate("postedBy", "fullName email profilePhotoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobEnquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Your enquiries fetched successfully",
      data: {
        enquiries,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get my enquiries error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching your enquiries",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET APPLIED JOBS (with full details)
// ==========================================

export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10, search } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Build filter
    let filter = { userId };
    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const appliedJobs = await JobEnquiry.find(filter)
      .populate({
        path: "jobId",
        select:
          "workTitle description location workersNeeded requiredSkills estimatedBudget budgetType deadline expectedStartDate status priority views totalApplications createdAt",
        match: search
          ? { workTitle: { $regex: search, $options: "i" } }
          : undefined,
      })
      .populate(
        "postedBy",
        "fullName email mobile profilePhotoUrl userType rating totalReviews"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out null jobId in case of deleted jobs
    const filteredJobs = appliedJobs.filter((enquiry) => enquiry.jobId !== null);

    // Calculate total without pagination for search
    const totalCount = await JobEnquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Applied jobs fetched successfully",
      data: {
        appliedJobs: filteredJobs.map((enquiry) => ({
          enquiryId: enquiry._id,
          status: enquiry.status,
          appliedAt: enquiry.createdAt,
          message: enquiry.message,
          acceptedAt: enquiry.acceptedAt,
          rejectedAt: enquiry.rejectedAt,
          rejectionReason: enquiry.rejectionReason,
          job: enquiry.jobId,
          postedBy: enquiry.postedBy,
        })),
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get applied jobs error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching applied jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 ACCEPT ENQUIRY (job creator accepts applicant)
// ==========================================

export const acceptEnquiry = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID format",
      });
    }

    // Find enquiry with populated job details
    const enquiry = await JobEnquiry.findById(enquiryId).populate("jobId").populate("userId").populate("postedBy");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Check authorization
    if (enquiry.postedBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only accept enquiries for your own jobs",
      });
    }

    // Cannot accept if already accepted or rejected
    if (enquiry.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept enquiry with status: ${enquiry.status}`,
      });
    }

    // Update enquiry status
    enquiry.status = "accepted";
    enquiry.acceptedAt = new Date();
    await enquiry.save();
    console.log("✅ Enquiry accepted:", enquiry._id);

    // Get job title for logging
    const jobTitle = enquiry.jobId?.workTitle || enquiry.jobDetails?.workTitle || "Unknown Job";

    // Update user job history
    await UserJobHistory.findOneAndUpdate(
      { enquiryId: enquiryId },
      {
        status: "accepted",
        "timeline.acceptedAt": new Date(),
        isActive: true,
      },
      { new: true }
    );

    // Log activity (non-blocking)
    logActivity(
      userId,
      "enquiry_accepted",
      enquiryId,
      "JobEnquiry",
      `Accepted enquiry for job: ${jobTitle}`,
      {
        jobTitle: jobTitle,
        applicantId: enquiry.userId._id,
        jobId: enquiry.jobId._id,
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    // Also add to job's selectedWorkers for reference
    try {
      const isAlreadySelected = await Job.findOne({
        _id: enquiry.jobId._id,
        "selectedWorkers.workerId": enquiry.userId._id,
      });

      if (!isAlreadySelected) {
        await Job.findByIdAndUpdate(
          enquiry.jobId._id,
          { $push: { selectedWorkers: { workerId: enquiry.userId._id, acceptedAt: new Date() } } },
          { new: true }
        );
      }
    } catch (jobUpdateErr) {
      console.error("Error updating job selectedWorkers:", jobUpdateErr);
    }

    // ==========================================
    // 📬 CREATE IN-APP NOTIFICATION
    // ==========================================
    const notification = new Notification({
      userId: enquiry.userId._id,
      notificationType: "enquiry_accepted",
      enquiryId: enquiry._id,
      jobId: enquiry.jobId._id,
      relatedUserId: enquiry.postedBy._id,
      title: `Job Application Accepted - ${jobTitle}`,
      message: `Congratulations! Your application for "${jobTitle}" has been accepted by ${enquiry.postedBy.fullName}. They will contact you soon with more details.`,
      details: {
        jobTitle: jobTitle,
        jobBudget: enquiry.jobId?.estimatedBudget,
        actionUrl: `/applied-jobs/${enquiry._id}`,
      },
      priority: "high",
      actionRequired: true,
    });

    await notification.save();
    console.log("✅ In-app notification created:", notification._id);

    // ==========================================
    // 📧 SEND ACCEPTANCE EMAIL (non-blocking)
    // ==========================================
    const applicantEmail = enquiry.userId?.email;
    if (applicantEmail) {
      const emailTemplate = jobAcceptanceTemplate(
        enquiry.userId?.fullName || "User",
        jobTitle,
        enquiry.postedBy?.fullName || "Contractor",
        {
          email: enquiry.postedBy?.email,
          mobile: enquiry.postedBy?.mobile,
        }
      );

      sendEmail({
        to: applicantEmail,
        subject: `✅ Job Application Accepted - ${jobTitle}`,
        html: emailTemplate,
      }).catch(err => {
        console.error("❌ Failed to send acceptance email:", err.message);
        // Don't fail the API if email fails
      });
    }

    await enquiry.populate("userId", "fullName email mobile profilePhotoUrl");

    res.status(200).json({
      success: true,
      message: "Enquiry accepted successfully. Applicant has been notified via email and in-app notification.",
      data: enquiry,
    });
  } catch (error) {
    console.error("Accept enquiry error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while accepting enquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 REJECT ENQUIRY (job creator rejects applicant)
// ==========================================

export const rejectEnquiry = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID format",
      });
    }

    // Find enquiry with populated job and user data
    const enquiry = await JobEnquiry.findById(enquiryId).populate("jobId").populate("userId").populate("postedBy");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Check authorization
    if (enquiry.postedBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only reject enquiries for your own jobs",
      });
    }

    // Reject is allowed only when enquiry is pending
    if (enquiry.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject enquiry with status: ${enquiry.status}`,
      });
    }

    // Update enquiry status
    enquiry.status = "rejected";
    enquiry.rejectedAt = new Date();
    enquiry.rejectionReason = reason || "";
    await enquiry.save();
    console.log("✅ Enquiry rejected:", enquiry._id);

    // Get job title for logging
    const jobTitle = enquiry.jobId?.workTitle || enquiry.jobDetails?.workTitle || "Unknown Job";

    // Update user job history
    await UserJobHistory.findOneAndUpdate(
      { enquiryId: enquiryId },
      {
        status: "rejected",
        "timeline.rejectedAt": new Date(),
        "timeline.rejectionReason": reason || "",
        isActive: false,
      },
      { new: true }
    );

    // Log activity (non-blocking)
    logActivity(
      userId,
      "enquiry_rejected",
      enquiryId,
      "JobEnquiry",
      `Rejected enquiry for job: ${jobTitle}`,
      {
        jobTitle: jobTitle,
        applicantId: enquiry.userId._id,
        reason: reason || "No reason provided",
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    // ==========================================
    // 📬 CREATE IN-APP NOTIFICATION
    // ==========================================
    const notification = new Notification({
      userId: enquiry.userId._id,
      notificationType: "enquiry_rejected",
      enquiryId: enquiry._id,
      jobId: enquiry.jobId._id,
      relatedUserId: enquiry.postedBy._id,
      title: `Application Not Selected - ${jobTitle}`,
      message: `Your application for "${jobTitle}" has not been selected. Please keep applying to other jobs and improve your profile to increase your chances.`,
      details: {
        jobTitle: jobTitle,
        jobBudget: enquiry.jobId?.estimatedBudget,
        rejectionReason: reason || "No reason provided",
        actionUrl: `/applied-jobs/${enquiry._id}`,
      },
      priority: "medium",
      actionRequired: false,
    });

    await notification.save();
    console.log("✅ In-app notification created:", notification._id);

    // ==========================================
    // 📧 SEND REJECTION EMAIL (non-blocking)
    // ==========================================
    const applicantEmail = enquiry.userId?.email;
    if (applicantEmail) {
      const emailTemplate = jobRejectionTemplate(
        enquiry.userId?.fullName || "User",
        jobTitle,
        enquiry.postedBy?.fullName || "Contractor",
        reason || ""
      );

      sendEmail({
        to: applicantEmail,
        subject: `Application Update - ${jobTitle}`,
        html: emailTemplate,
      }).catch(err => {
        console.error("❌ Failed to send rejection email:", err.message);
        // Don't fail the API if email fails
      });
    }

    await enquiry.populate("userId", "fullName email mobile profilePhotoUrl");

    res.status(200).json({
      success: true,
      message: "Enquiry rejected successfully. Applicant has been notified via email and in-app notification.",
      data: enquiry,
    });
  } catch (error) {
    console.error("Reject enquiry error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while rejecting enquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 WITHDRAW ENQUIRY (applicant withdraws application)
// ==========================================

export const withdrawEnquiry = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID format",
      });
    }

    // Find enquiry with populated job
    const enquiry = await JobEnquiry.findById(enquiryId).populate("jobId");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Check authorization - only applicant can withdraw
    if (enquiry.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only withdraw your own enquiries",
      });
    }

    // Cannot withdraw if already rejected or accepted
    if (enquiry.status === "accepted" || enquiry.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw enquiry with status: ${enquiry.status}`,
      });
    }

    // Update enquiry status
    enquiry.status = "withdrawn";
    await enquiry.save();

    // Get job title for logging
    const jobTitle = enquiry.jobId?.workTitle || enquiry.jobDetails?.workTitle || "Unknown Job";

    // Update user job history
    await UserJobHistory.findOneAndUpdate(
      { enquiryId: enquiryId },
      {
        status: "withdrawn",
        "timeline.withdrawnAt": new Date(),
        isActive: false,
      },
      { new: true }
    );

    // Log activity (non-blocking)
    logActivity(
      userId,
      "enquiry_withdrawn",
      enquiryId,
      "JobEnquiry",
      `Withdrew enquiry for job: ${jobTitle}`,
      {
        jobTitle: jobTitle,
        jobId: enquiry.jobId,
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    res.status(200).json({
      success: true,
      message: "Enquiry withdrawn successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Withdraw enquiry error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while withdrawing enquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 GET ENQUIRY DETAILS
// ==========================================

export const getEnquiryDetails = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID format",
      });
    }

    const enquiry = await JobEnquiry.findById(enquiryId)
      .populate("userId", "fullName email mobile profilePhotoUrl userType rating totalReviews experience skills")
      .populate("jobId", "workTitle description estimatedBudget location workersNeeded")
      .populate("postedBy", "fullName email profilePhotoUrl");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Check authorization - only job creator or applicant can view
    if (
      enquiry.postedBy._id.toString() !== userId &&
      enquiry.userId._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this enquiry",
      });
    }

    // Increment views
    enquiry.views = (enquiry.views || 0) + 1;
    await enquiry.save();

    res.status(200).json({
      success: true,
      message: "Enquiry details fetched successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Get enquiry details error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching enquiry details",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 ADD NOTES TO ENQUIRY (job creator)
// ==========================================

export const addNotesToEnquiry = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;
    const { notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID format",
      });
    }

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: "Please provide notes",
      });
    }

    const enquiry = await JobEnquiry.findById(enquiryId);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Check authorization
    if (enquiry.postedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only add notes to enquiries for your own jobs",
      });
    }

    enquiry.notes = notes;
    await enquiry.save();

    await enquiry.populate("userId", "fullName email mobile profilePhotoUrl");

    res.status(200).json({
      success: true,
      message: "Notes added successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Add notes error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding notes",
      error: error.message,
    });
  }
};

// ==========================================
// 🔗 CONNECT APPLICATION (pending → accepted)
// POST /api/job-enquiries/:enquiryId/connect
// Job creator calls this to connect/hire the applicant.
// Same effect as acceptEnquiry with clean route naming.
// ==========================================

export const connectApplication = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID format" });
    }

    const enquiry = await JobEnquiry.findById(enquiryId)
      .populate("jobId")
      .populate("userId")
      .populate("postedBy");

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Only the job creator can connect
    if (enquiry.postedBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the job owner can connect with an applicant",
      });
    }

    // Must be pending
    if (enquiry.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot connect — application is already "${enquiry.status}"`,
        currentStatus: enquiry.status,
      });
    }

    const jobTitle = enquiry.jobId?.workTitle || "Unknown Job";
    const now = new Date();

    // Update enquiry
    enquiry.status = "accepted";
    enquiry.acceptedAt = now;
    await enquiry.save();

    // Update UserJobHistory
    await UserJobHistory.findOneAndUpdate(
      { enquiryId },
      { status: "accepted", "timeline.acceptedAt": now, isActive: true },
      { new: true }
    );

    // Add to job.selectedWorkers (if not already)
    const job = enquiry.jobId;
    const alreadySelected = job.selectedWorkers?.some(
      (w) => w.workerId.toString() === enquiry.userId._id.toString()
    );
    if (!alreadySelected) {
      await Job.findByIdAndUpdate(job._id, {
        $push: { selectedWorkers: { workerId: enquiry.userId._id, acceptedAt: now } },
      });
    }

    // In-app notification (non-blocking)
    new Notification({
      userId: enquiry.userId._id,
      notificationType: "enquiry_accepted",
      enquiryId: enquiry._id,
      jobId: job._id,
      relatedUserId: enquiry.postedBy._id,
      title: `You're connected! — ${jobTitle}`,
      message: `${enquiry.postedBy.fullName} has accepted your application for "${jobTitle}". They will contact you soon.`,
      details: {
        jobTitle,
        jobBudget: job.estimatedBudget,
        actionUrl: `/applied-jobs/${enquiry._id}`,
      },
      priority: "high",
      actionRequired: true,
    }).save().catch((e) => console.error("Notification error:", e));

    // Email (non-blocking)
    if (enquiry.userId?.email) {
      const html = jobAcceptanceTemplate(
        enquiry.userId.fullName || "Applicant",
        jobTitle,
        enquiry.postedBy.fullName || "Contractor",
        { email: enquiry.postedBy.email, mobile: enquiry.postedBy.mobile }
      );
      sendEmail({
        to: enquiry.userId.email,
        subject: `✅ Application Accepted — ${jobTitle}`,
        html,
      }).catch((e) => console.error("Email error:", e));
    }

    // Activity log (non-blocking)
    logActivity(
      userId, "enquiry_accepted", enquiryId, "JobEnquiry",
      `Connected with applicant for: ${jobTitle}`,
      { jobTitle, applicantId: enquiry.userId._id, jobId: job._id },
      req
    ).catch((e) => console.error("Activity log error:", e));

    await enquiry.populate("userId", "fullName email mobile profilePhotoUrl userType rating skills");

    return res.status(200).json({
      success: true,
      message: `Connected successfully! ${enquiry.userId.fullName} has been notified.`,
      data: {
        enquiryId: enquiry._id,
        status: enquiry.status,
        acceptedAt: enquiry.acceptedAt,
        jobTitle,
        applicant: {
          userId: enquiry.userId._id,
          name: enquiry.userId.fullName,
          email: enquiry.userId.email,
          mobile: enquiry.userId.mobile,
          profilePhoto: enquiry.userId.profilePhotoUrl,
          userType: enquiry.userId.userType,
          rating: enquiry.userId.rating,
          skills: enquiry.userId.skills,
        },
        nextStep: "Once work is done, call POST /api/job-enquiries/:enquiryId/complete with rating & feedback",
      },
    });
  } catch (error) {
    console.error("connectApplication error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to connect application",
      error: error.message,
    });
  }
};

// ==========================================
// ✅ COMPLETE APPLICATION (accepted → completed)
// POST /api/job-enquiries/:enquiryId/complete
// Job creator marks work as done + submits mandatory rating & feedback.
// This creates a UserReview and updates the labour's profile rating.
// ==========================================

export const completeApplication = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;
    const { rating, feedback, ratingDetails } = req.body;

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID format" });
    }

    // --- Validate mandatory rating + feedback ---
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "rating is required and must be between 1 and 5",
      });
    }
    if (!feedback || String(feedback).trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "feedback is required and must be at least 10 characters",
      });
    }

    // Validate optional ratingDetails
    if (ratingDetails) {
      const fields = ["workQuality", "communication", "timeliness", "professionalism"];
      for (const f of fields) {
        if (ratingDetails[f] !== undefined && (ratingDetails[f] < 1 || ratingDetails[f] > 5)) {
          return res.status(400).json({
            success: false,
            message: `ratingDetails.${f} must be between 1 and 5`,
          });
        }
      }
    }

    const enquiry = await JobEnquiry.findById(enquiryId)
      .populate("jobId")
      .populate("userId")
      .populate("postedBy");

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Only the job creator can complete
    if (enquiry.postedBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the job owner can mark an application as completed",
      });
    }

    // Must be accepted before completing
    if (enquiry.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete — application status is "${enquiry.status}". Must be "accepted" first.`,
        currentStatus: enquiry.status,
      });
    }

    const now = new Date();
    const job = enquiry.jobId;
    const labour = enquiry.userId;
    const jobTitle = job?.workTitle || "Unknown Job";

    // --- Check for duplicate review ---
    const existingReview = await UserReview.findOne({
      jobId: job._id,
      userId: labour._id,
      reviewedBy: userId,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this application",
      });
    }

    // --- 1. Update JobEnquiry: accepted → completed ---
    enquiry.status = "completed";
    enquiry.completedAt = now;
    await enquiry.save();

    // --- 2. Update UserJobHistory ---
    await UserJobHistory.findOneAndUpdate(
      { enquiryId },
      {
        status: "completed",
        "timeline.completedAt": now,
        isActive: false,
      },
      { new: true }
    );

    // --- 3. Create UserReview ---
    const contractor = await User.findById(userId).select("fullName userType profilePhotoUrl");

    const review = new UserReview({
      jobId: job._id,
      userId: labour._id,
      reviewedBy: userId,
      rating: Number(rating),
      feedback: String(feedback).trim(),
      ratingDetails: ratingDetails || {},
      reviewType: "contractor_review",
      isVerified: true,
      jobDetails: {
        workTitle: jobTitle,
        estimatedBudget: job.estimatedBudget,
        completedAt: now,
      },
      reviewerDetails: {
        name: contractor?.fullName,
        userType: contractor?.userType,
        profilePhotoUrl: contractor?.profilePhotoUrl,
      },
      recipientDetails: {
        name: labour?.fullName,
        userType: labour?.userType,
        rating: labour?.rating,
      },
    });
    await review.save();

    // --- 4. Recalculate labour's average rating ---
    const currentTotalReviews = labour.totalReviews || 0;
    const currentRating = labour.rating || 0;
    const newTotalReviews = currentTotalReviews + 1;
    const newRating =
      Math.round(
        ((currentRating * currentTotalReviews + Number(rating)) / newTotalReviews) * 10
      ) / 10;

    await User.findByIdAndUpdate(labour._id, {
      rating: newRating,
      totalReviews: newTotalReviews,
      $inc: { completedJobs: 1 },
    });

    // --- 5. In-app notification to labour (non-blocking) ---
    new Notification({
      userId: labour._id,
      notificationType: "job_completed",
      enquiryId: enquiry._id,
      jobId: job._id,
      relatedUserId: userId,
      title: `Job Completed — ${jobTitle}`,
      message: `${contractor?.fullName} has marked your work on "${jobTitle}" as completed and left you a ${rating}⭐ review.`,
      details: {
        jobTitle,
        jobBudget: job.estimatedBudget,
        actionUrl: `/applied-jobs/${enquiry._id}`,
      },
      priority: "high",
      actionRequired: false,
    }).save().catch((e) => console.error("Notification error:", e));

    // --- 6. Activity log (non-blocking) ---
    logActivity(
      userId, "job_completed", enquiryId, "JobEnquiry",
      `Completed application and reviewed: ${jobTitle}`,
      { jobTitle, applicantId: labour._id, rating, jobId: job._id },
      req
    ).catch((e) => console.error("Activity log error:", e));

    return res.status(200).json({
      success: true,
      message: "Application marked as completed. Review submitted and labour profile updated.",
      data: {
        enquiryId: enquiry._id,
        status: enquiry.status,
        completedAt: enquiry.completedAt,
        jobTitle,
        review: {
          reviewId: review._id,
          rating: review.rating,
          feedback: review.feedback,
          ratingDetails: review.ratingDetails,
        },
        labourUpdated: {
          userId: labour._id,
          name: labour.fullName,
          previousRating: currentRating,
          newRating,
          totalReviews: newTotalReviews,
        },
      },
    });
  } catch (error) {
    console.error("completeApplication error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete application",
      error: error.message,
    });
  }
};

// ==========================================
// ⭐ SUBMIT FEEDBACK (worker → job creator)
// POST /api/job-enquiries/:enquiryId/submitfeedback
// After a job is completed, the applicant (labour/sub_contractor)
// submits their review of the job creator (contractor/sub_contractor).
// ==========================================

export const submitFeedback = async (req, res) => {
  try {
    const userId = req.userId;
    const { enquiryId } = req.params;
    const { rating, feedback, ratingDetails } = req.body;

    if (!enquiryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID format" });
    }

    // --- Validate mandatory rating + feedback ---
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "rating is required and must be between 1 and 5",
      });
    }
    if (!feedback || String(feedback).trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "feedback is required and must be at least 10 characters",
      });
    }

    // Validate optional ratingDetails
    if (ratingDetails) {
      const fields = ["workQuality", "communication", "timeliness", "professionalism"];
      for (const f of fields) {
        if (ratingDetails[f] !== undefined && (ratingDetails[f] < 1 || ratingDetails[f] > 5)) {
          return res.status(400).json({
            success: false,
            message: `ratingDetails.${f} must be between 1 and 5`,
          });
        }
      }
    }

    const enquiry = await JobEnquiry.findById(enquiryId)
      .populate("jobId")
      .populate("userId")
      .populate("postedBy");

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Only the applicant (worker) can submit feedback
    if (enquiry.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the applicant can submit feedback for the job creator",
      });
    }

    // Job must be completed first
    if (enquiry.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: `Cannot submit feedback — application status is "${enquiry.status}". Job must be completed first.`,
      });
    }

    const job = enquiry.jobId;
    const jobCreator = enquiry.postedBy;

    // --- Check for duplicate review ---
    const existingReview = await UserReview.findOne({
      jobId: job._id,
      userId: jobCreator._id,
      reviewedBy: userId,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this job",
      });
    }

    // Get worker details
    const worker = await User.findById(userId).select("fullName userType profilePhotoUrl");

    // --- Create UserReview: worker reviews job creator ---
    const review = new UserReview({
      jobId: job._id,
      userId: jobCreator._id,       // Being reviewed: job creator
      reviewedBy: userId,            // Reviewer: worker
      rating: Number(rating),
      feedback: String(feedback).trim(),
      ratingDetails: ratingDetails || {},
      reviewType: "worker_review",
      isVerified: true,
      jobDetails: {
        workTitle: job.workTitle || "Unknown Job",
        estimatedBudget: job.estimatedBudget,
        completedAt: enquiry.completedAt,
      },
      reviewerDetails: {
        name: worker?.fullName,
        userType: worker?.userType,
        profilePhotoUrl: worker?.profilePhotoUrl,
      },
      recipientDetails: {
        name: jobCreator?.fullName,
        userType: jobCreator?.userType,
        rating: jobCreator?.rating,
      },
    });
    await review.save();

    // --- Recalculate job creator's average rating ---
    const currentTotalReviews = jobCreator.totalReviews || 0;
    const currentRating = jobCreator.rating || 0;
    const newTotalReviews = currentTotalReviews + 1;
    const newRating =
      Math.round(
        ((currentRating * currentTotalReviews + Number(rating)) / newTotalReviews) * 10
      ) / 10;

    await User.findByIdAndUpdate(jobCreator._id, {
      rating: newRating,
      totalReviews: newTotalReviews,
    });

    // --- Notification to job creator (non-blocking) ---
    new Notification({
      userId: jobCreator._id,
      notificationType: "feedback_received",
      enquiryId: enquiry._id,
      jobId: job._id,
      relatedUserId: userId,
      title: `Feedback Received — ${job.workTitle}`,
      message: `${worker?.fullName} has submitted a ${rating}⭐ review for "${job.workTitle}".`,
      details: {
        jobTitle: job.workTitle,
        actionUrl: `/my-jobs/${job._id}`,
      },
      priority: "medium",
      actionRequired: false,
    }).save().catch((e) => console.error("Notification error:", e));

    // --- Activity log (non-blocking) ---
    logActivity(
      userId, "feedback_submitted", enquiryId, "JobEnquiry",
      `Submitted feedback for job creator: ${job.workTitle}`,
      { jobTitle: job.workTitle, jobCreatorId: jobCreator._id, rating, jobId: job._id },
      req
    ).catch((e) => console.error("Activity log error:", e));

    return res.status(200).json({
      success: true,
      message: "Feedback submitted successfully. Job creator's profile updated.",
      data: {
        enquiryId: enquiry._id,
        jobTitle: job.workTitle,
        review: {
          reviewId: review._id,
          rating: review.rating,
          feedback: review.feedback,
          ratingDetails: review.ratingDetails,
        },
        jobCreatorUpdated: {
          userId: jobCreator._id,
          name: jobCreator.fullName,
          previousRating: currentRating,
          newRating,
          totalReviews: newTotalReviews,
        },
      },
    });
  } catch (error) {
    console.error("submitFeedback error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
};
