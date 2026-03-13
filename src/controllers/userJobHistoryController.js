import mongoose from "mongoose";
import UserJobHistory from "../models/UserJobHistory.js";
import Job from "../models/Job.js";
import User from "../models/User.js";

// Get all job history for a user with pagination
export const getUserJobHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.userId;

    let query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const history = await UserJobHistory.find(query)
      .sort({ "timeline.appliedAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName")
      .populate("enquiryId");

    const total = await UserJobHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Job history fetched successfully",
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get applied jobs history
export const getAppliedJobsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const skip = (page - 1) * limit;

    const appliedJobs = await UserJobHistory.find({
      userId,
      status: "applied",
      isActive: true,
    })
      .sort({ "timeline.appliedAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName rating");

    const total = await UserJobHistory.countDocuments({
      userId,
      status: "applied",
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: "Applied jobs fetched successfully",
      data: appliedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get accepted jobs history
export const getAcceptedJobsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const skip = (page - 1) * limit;

    const acceptedJobs = await UserJobHistory.find({
      userId,
      status: "accepted",
    })
      .sort({ "timeline.acceptedAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName rating");

    const total = await UserJobHistory.countDocuments({
      userId,
      status: "accepted",
    });

    return res.status(200).json({
      success: true,
      message: "Accepted jobs fetched successfully",
      data: acceptedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get rejected jobs history
export const getRejectedJobsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const skip = (page - 1) * limit;

    const rejectedJobs = await UserJobHistory.find({
      userId,
      status: "rejected",
    })
      .sort({ "timeline.rejectedAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName");

    const total = await UserJobHistory.countDocuments({
      userId,
      status: "rejected",
    });

    return res.status(200).json({
      success: true,
      message: "Rejected jobs fetched successfully",
      data: rejectedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get withdrawn jobs history
export const getWithdrawnJobsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const skip = (page - 1) * limit;

    const withdrawnJobs = await UserJobHistory.find({
      userId,
      status: "withdrawn",
    })
      .sort({ "timeline.withdrawnAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName");

    const total = await UserJobHistory.countDocuments({
      userId,
      status: "withdrawn",
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawn jobs fetched successfully",
      data: withdrawnJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get completed jobs history
export const getCompletedJobsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const skip = (page - 1) * limit;

    const completedJobs = await UserJobHistory.find({
      userId,
      status: "completed",
    })
      .sort({ "timeline.completedAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName rating");

    const total = await UserJobHistory.countDocuments({
      userId,
      status: "completed",
    });

    return res.status(200).json({
      success: true,
      message: "Completed jobs fetched successfully",
      data: completedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get job history statistics for a user
export const getJobHistoryStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await UserJobHistory.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await UserJobHistory.countDocuments({ userId });
    const activeApplications = await UserJobHistory.countDocuments({
      userId,
      status: "applied",
      isActive: true,
    });

    const statsByStatus = {};
    stats.forEach((stat) => {
      statsByStatus[stat._id] = stat.count;
    });

    return res.status(200).json({
      success: true,
      message: "Job history statistics fetched",
      data: {
        totalApplications: total,
        activeApplications,
        byStatus: statsByStatus,
        breakdown: {
          applied: statsByStatus.applied || 0,
          accepted: statsByStatus.accepted || 0,
          rejected: statsByStatus.rejected || 0,
          withdrawn: statsByStatus.withdrawn || 0,
          completed: statsByStatus.completed || 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get detailed job history with timeline
export const getDetailedJobHistory = async (req, res) => {
  try {
    const { jobHistoryId } = req.params;
    const userId = req.user.userId;

    const history = await UserJobHistory.findOne({
      _id: jobHistoryId,
      userId,
    })
      .populate("jobId")
      .populate("postedBy", "fullName email mobile companyName rating profilePhotoUrl")
      .populate("enquiryId");

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Job history not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detailed job history fetched",
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get timeline of changes for a specific job application
export const getApplicationTimeline = async (req, res) => {
  try {
    const { jobHistoryId } = req.params;
    const userId = req.user.userId;

    const history = await UserJobHistory.findOne({
      _id: jobHistoryId,
      userId,
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Job history not found",
      });
    }

    const timeline = [
      {
        action: "Applied",
        timestamp: history.timeline.appliedAt,
        status: "applied",
      },
    ];

    if (history.timeline.acceptedAt) {
      timeline.push({
        action: "Accepted",
        timestamp: history.timeline.acceptedAt,
        status: "accepted",
      });
    }

    if (history.timeline.rejectedAt) {
      timeline.push({
        action: "Rejected",
        timestamp: history.timeline.rejectedAt,
        reason: history.timeline.rejectionReason,
        status: "rejected",
      });
    }

    if (history.timeline.withdrawnAt) {
      timeline.push({
        action: "Withdrawn",
        timestamp: history.timeline.withdrawnAt,
        status: "withdrawn",
      });
    }

    if (history.timeline.completedAt) {
      timeline.push({
        action: "Completed",
        timestamp: history.timeline.completedAt,
        status: "completed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application timeline fetched",
      data: {
        jobTitle: history.jobDetails.workTitle,
        currentStatus: history.status,
        timeline: timeline.sort((a, b) => b.timestamp - a.timestamp),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get jobs by contractor (for contractors to see who applied)
export const getJobApplicationsByContractor = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const contractorId = req.user.userId;

    const skip = (page - 1) * limit;

    let query = { postedBy: contractorId };
    if (status) {
      query.status = status;
    }

    const applications = await UserJobHistory.find(query)
      .sort({ "timeline.appliedAt": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId")
      .populate("userId", "fullName email mobile skills experience rating profilePhotoUrl");

    const total = await UserJobHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Applications fetched for contractor",
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Smart API - Returns data based on user type
export const getApplicationsByUserType = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.userId;
    const userType = req.user.userType;

    const skip = (page - 1) * limit;

    let query = {};
    let sortField = "timeline.appliedAt";
    let populateFields = "";

    // Determine query based on user type
    if (userType === "contractor" || userType === "sub_contractor") {
      // Contractors see applications they received
      query = { postedBy: userId };
      populateFields = "userId";
    } else {
      // Labour sees applications they submitted
      query = { userId };
      populateFields = "postedBy";
    }

    // Apply status filter if provided
    if (status) {
      query.status = status;
    }

    const applications = await UserJobHistory.find(query)
      .sort({ [sortField]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId", "workTitle description estimatedBudget location status workersNeeded requiredSkills")
      .populate(populateFields, "fullName email mobile skills experience rating profilePhotoUrl companyName userType");

    const total = await UserJobHistory.countDocuments(query);

    // Determine message based on user type
    const message = 
      userType === "contractor" || userType === "sub_contractor"
        ? "Applications received fetched successfully"
        : "Applied jobs fetched successfully";

    return res.status(200).json({
      success: true,
      message,
      userType,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
