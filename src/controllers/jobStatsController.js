import Job from "../models/Job.js";
import JobEnquiry from "../models/JobEnquiry.js";
import UserJobHistory from "../models/UserJobHistory.js";
import User from "../models/User.js";

// ==========================================
// 📊 GET JOB STATS — Single API, responds based on userType
// GET /api/jobs/stats
//
// Labour     → availableJobs, requestsSent, accepted, completed, rejected
// Contractor → jobsPosted, activeJobs, applicationsReceived, accepted, completedJobs, rejected
// Sub-con    → jobsPosted, activeJobs, completedJobs, availableJobs,
//              applicationsReceived, acceptedFromApplicants, rejectedFromApplicants, requestsSent
// ==========================================

export const getJobStats = async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch user to get their userType (not stored in token)
    const user = await User.findById(userId).select("userType fullName");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { userType } = user;
    let stats = {};

    // ==========================================
    // LABOUR — only applies to jobs, never posts them
    // ==========================================
    if (userType === "labour") {
      const [availableJobs, requestsSent, accepted, rejected, completed] =
        await Promise.all([
          // Jobs open for labour (not created by self)
          Job.countDocuments({
            target: "labour",
            status: "open",
            createdBy: { $ne: userId },
          }),

          // Total enquiries submitted by this labour
          JobEnquiry.countDocuments({ userId }),

          // Enquiries where contractor accepted this labour
          JobEnquiry.countDocuments({ userId, status: "accepted" }),

          // Enquiries rejected by contractor
          JobEnquiry.countDocuments({ userId, status: "rejected" }),

          // Jobs actually marked completed in their history
          UserJobHistory.countDocuments({ userId, status: "completed" }),
        ]);

      stats = {
        availableJobs,
        requestsSent,
        accepted,
        completed,
        rejected,
      };

    // ==========================================
    // CONTRACTOR — posts jobs, manages applicants
    // ==========================================
    } else if (userType === "contractor") {
      const [
        jobsPosted,
        activeJobs,
        completedJobs,
        applicationsReceived,
        accepted,
        rejected,
      ] = await Promise.all([
        // Total jobs posted by this contractor
        Job.countDocuments({ createdBy: userId }),

        // Jobs still active (open or in progress)
        Job.countDocuments({
          createdBy: userId,
          status: { $in: ["open", "in_progress"] },
        }),

        // Jobs finished
        Job.countDocuments({ createdBy: userId, status: "completed" }),

        // All enquiries received across all posted jobs
        JobEnquiry.countDocuments({ postedBy: userId }),

        // Enquiries the contractor accepted
        JobEnquiry.countDocuments({ postedBy: userId, status: "accepted" }),

        // Enquiries the contractor rejected
        JobEnquiry.countDocuments({ postedBy: userId, status: "rejected" }),
      ]);

      stats = {
        jobsPosted,
        activeJobs,
        applicationsReceived,
        accepted,
        completedJobs,
        rejected,
      };

    // ==========================================
    // SUB-CONTRACTOR — dual role: posts jobs AND applies to jobs
    // ==========================================
    } else if (userType === "sub_contractor") {
      const [
        // --- As employer (posted jobs side) ---
        jobsPosted,
        activeJobs,
        completedJobs,
        applicationsReceived,
        acceptedFromApplicants,
        rejectedFromApplicants,

        // --- As applicant (applied to contractor jobs) ---
        availableJobs,
        requestsSent,
        myAccepted,
        myRejected,
        myCompleted,
      ] = await Promise.all([
        Job.countDocuments({ createdBy: userId }),

        Job.countDocuments({
          createdBy: userId,
          status: { $in: ["open", "in_progress"] },
        }),

        Job.countDocuments({ createdBy: userId, status: "completed" }),

        JobEnquiry.countDocuments({ postedBy: userId }),

        JobEnquiry.countDocuments({ postedBy: userId, status: "accepted" }),

        JobEnquiry.countDocuments({ postedBy: userId, status: "rejected" }),

        // Jobs open for sub_contractors to apply (not own jobs)
        Job.countDocuments({
          target: "sub_contractor",
          status: "open",
          createdBy: { $ne: userId },
        }),

        // Total enquiries this sub-contractor sent
        JobEnquiry.countDocuments({ userId }),

        // Enquiries where they (as applicant) got accepted
        JobEnquiry.countDocuments({ userId, status: "accepted" }),

        // Enquiries where they (as applicant) got rejected
        JobEnquiry.countDocuments({ userId, status: "rejected" }),

        // Jobs completed as a worker
        UserJobHistory.countDocuments({ userId, status: "completed" }),
      ]);

      stats = {
        // As employer
        jobsPosted,
        activeJobs,
        completedJobs,
        applicationsReceived,
        acceptedFromApplicants,
        rejectedFromApplicants,

        // As applicant
        availableJobs,
        requestsSent,
        myAccepted,
        myRejected,
        myCompleted,
      };

    // ==========================================
    // ADMIN / SUPER_ADMIN — platform-wide view
    // ==========================================
    } else if (userType === "admin" || userType === "super_admin") {
      const [
        totalJobs,
        activeJobs,
        completedJobs,
        totalApplications,
        totalAccepted,
        totalRejected,
        totalUsers,
      ] = await Promise.all([
        Job.countDocuments({}),
        Job.countDocuments({ status: { $in: ["open", "in_progress"] } }),
        Job.countDocuments({ status: "completed" }),
        JobEnquiry.countDocuments({}),
        JobEnquiry.countDocuments({ status: "accepted" }),
        JobEnquiry.countDocuments({ status: "rejected" }),
        User.countDocuments({ userType: { $in: ["labour", "contractor", "sub_contractor"] } }),
      ]);

      stats = {
        totalJobs,
        activeJobs,
        completedJobs,
        totalApplications,
        totalAccepted,
        totalRejected,
        totalUsers,
      };

    } else {
      return res.status(400).json({
        success: false,
        message: `Stats not available for userType: ${userType}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job stats fetched successfully",
      data: {
        userType,
        stats,
      },
    });
  } catch (error) {
    console.error("getJobStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job stats",
      error: error.message,
    });
  }
};
