import Job from "../models/Job.js";
import JobEnquiry from "../models/JobEnquiry.js";
import User from "../models/User.js";
import UserJobHistory from "../models/UserJobHistory.js";
import { logActivity } from "../utils/activityLogger.js";

// ==========================================
// 📋 CREATE JOB
// ==========================================

export const createJob = async (req, res) => {
  try {
    const userId = req.userId;

    // Validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const {
      workTitle,
      description,
      location,
      workersNeeded,
      requiredSkills,
      requiredDetails,
      supportDocuments,
      images,
      estimatedBudget,
      budgetType,
      deadline,
      expectedStartDate,
      duration,
      workType,
      category,
      priority,
      target,
    } = req.body;

    // Validation - Required fields
    if (!workTitle || !description || !location || !workersNeeded || !target) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields: workTitle, description, location, workersNeeded, target",
      });
    }

    // Validate target is an array
    if (!Array.isArray(target)) {
      return res.status(400).json({
        success: false,
        message: "target must be an array",
      });
    }

    // Validate target values
    // Users can send: ["labour"] or ["contractor"] or ["sub_contractor"] or ["labour", "contractor"] etc.
    const validTargetValues = ["labour", "contractor", "sub_contractor"];
    const invalidTargets = target.filter(t => !validTargetValues.includes(t));
    
    if (invalidTargets.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid target values: ${invalidTargets.join(", ")}. Valid values are: labour, contractor, sub_contractor`,
      });
    }

    if (target.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one target audience",
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

    // Only Contractor and Sub-contractor can create jobs
    if (user.userType === "labour") {
      return res.status(403).json({
        success: false,
        message: "Only contractors and sub-contractors can post jobs",
      });
    }

    // Check job creation limits for contractors and sub-contractors
    const totalJobsCount = await Job.countDocuments({ createdBy: userId });
    const activeJobsCount = await Job.countDocuments({
      createdBy: userId,
      status: "open",
      visibility: true,
    });

    console.log(`📊 Job creation stats for user ${userId}:`);
    console.log(`   Total jobs: ${totalJobsCount}`);
    console.log(`   Active jobs: ${activeJobsCount}`);

    // Max 20 total jobs limit
    if (totalJobsCount >= 20) {
      return res.status(400).json({
        success: false,
        message: "You have reached the maximum limit of 20 jobs. Please close or archive some jobs before creating new ones.",
        currentJobs: totalJobsCount,
        maxJobs: 20,
      });
    }

    // If 5 active jobs exist, new job will be created with visibility: false
    let jobVisibility = true;
    let visibilityMessage = null;

    console.log(`🔍 Checking visibility condition: activeJobsCount (${activeJobsCount}) >= 5?`);

    if (activeJobsCount >= 5) {
      jobVisibility = false;
      visibilityMessage = `You have already shown ${activeJobsCount} active jobs. This new job has been created but is inactive. Please deactivate one of your active jobs to make this job visible.`;
      console.log(`❌ Active limit reached: Setting jobVisibility = false`);
    } else {
      console.log(`✅ Within active limit: Setting jobVisibility = true`);
    }

    // Create job object
    const jobData = {
      workTitle: workTitle.trim(),
      description: description.trim(),
      location:
        typeof location === "string"
          ? { address: location }
          : {
              city: location.city,
              state: location.state,
              area: location.area,
              pincode: location.pincode,
              address: location.address,
              coordinates: location.coordinates || {
                type: "Point",
                coordinates: [0, 0],
              },
            },
      workersNeeded: parseInt(workersNeeded),
      requiredSkills: requiredSkills || [],
      requiredDetails: requiredDetails || "",
      supportDocuments: supportDocuments || [],
      images: Array.isArray(images) ? images : images ? [images] : [],
      estimatedBudget: estimatedBudget ? parseInt(estimatedBudget) : null,
      budgetType: budgetType || "fixed",
      deadline: deadline ? new Date(deadline) : null,
      expectedStartDate: expectedStartDate ? new Date(expectedStartDate) : null,
      duration: duration || null,
      workType: workType || "",
      category: category || "",
      priority: priority || "medium",
      target: target, // Use target from request body
      createdBy: userId,
      createdByUserType: user.userType,
      status: "open",
      visibility: jobVisibility, // Use the determined visibility
    };

    // Create and save job
    const job = new Job(jobData);
    console.log(`📝 Before saving - Job visibility: ${job.visibility}`);
    await job.save();
    console.log(`💾 After saving - Job visibility: ${job.visibility}`);

    // Log activity (non-blocking)
    logActivity(
      userId,
      "job_created",
      job._id,
      "Job",
      `Job created: ${job.workTitle}`,
      {
        jobTitle: job.workTitle,
        budget: job.estimatedBudget,
        workersNeeded: job.workersNeeded,
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    // Populate creator details
    await job.populate("createdBy", "fullName email mobile profilePhotoUrl userType companyName rating completedJobs location");

    const response = {
      success: true,
      message: visibilityMessage || "Job created successfully",
      data: job,
    };

    // Add warning info if job was created as inactive
    if (visibilityMessage) {
      response.warning = {
        activeJobs: activeJobsCount,
        maxActiveJobs: 5,
        jobCreatedAs: "inactive",
        suggestion: "Go to 'My Jobs' and deactivate one of your active jobs, then activate this job.",
      };
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating job",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET JOBS (with visibility rules)
// ==========================================

export const getJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, location, skills, page = 1, limit = 10, search } = req.query;

    // Get user details
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build filter based on user type
    let filter = { status: status || "open", visibility: true }; // Only show visible jobs

    if (search) {
      filter.$or = [
        { workTitle: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (location) {
      filter["location.city"] = { $regex: location, $options: "i" };
    }

    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filter.requiredSkills = { $in: skillsArray };
    }

    // Visibility Rules
    if (user.userType === "labour") {
      // Labour can see jobs from both Contractor and Sub-contractor (but only visible ones)
      filter.$or = [
        { target: "labour", visibility: true },
        { createdBy: userId }, // Can see own jobs (both visible and hidden)
      ];
    } else if (user.userType === "contractor") {
      // Contractor can only see own posted jobs (visible or hidden)
      filter.createdBy = userId;
    } else if (user.userType === "sub_contractor") {
      // Sub-contractor can see contractor jobs (visible) and own jobs (both visible and hidden)
      filter.$or = [
        { target: "sub_contractor", createdByUserType: "contractor", visibility: true },
        { createdBy: userId }, // Can see own jobs (both visible and hidden)
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get jobs with pagination
    const jobs = await Job.find(filter)
      .populate("createdBy", "fullName email mobile profilePhotoUrl userType")
      .populate("assignedTo", "fullName email mobile profilePhotoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      data: {
        jobs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET MY JOBS (Jobs posted by current user)
// ==========================================

export const getMyJobs = async (req, res) => {
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
    let filter = { createdBy: userId };
    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const jobs = await Job.find(filter)
      .populate("createdBy", "fullName email mobile profilePhotoUrl")
      .populate("assignedTo", "fullName email mobile profilePhotoUrl")
      .populate("selectedWorkers.workerId", "fullName email mobile profilePhotoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Your jobs fetched successfully",
      data: {
        jobs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get my jobs error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching your jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET JOB BY ID
// ==========================================

export const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    // Validate job ID
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId)
      .populate("createdBy", "fullName email mobile profilePhotoUrl userType rating totalReviews")
      .populate("assignedTo", "fullName email mobile profilePhotoUrl")
      .populate("selectedWorkers.workerId", "fullName email mobile profilePhotoUrl");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check visibility rules if user is different from creator
    if (userId && userId !== job.createdBy._id.toString()) {
      const user = await User.findById(userId);

      if (user && !job.target.includes(user.userType)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view this job",
        });
      }
    }

    // Increment views
    job.views = (job.views || 0) + 1;
    await job.save();

    res.status(200).json({
      success: true,
      message: "Job fetched successfully",
      data: job,
    });
  } catch (error) {
    console.error("Get job by ID error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching job",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 UPDATE JOB
// ==========================================

export const updateJob = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate job ID
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Only job creator can update
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update jobs you created",
      });
    }

    // Fields that cannot be updated
    const restrictedFields = [
      "_id",
      "createdBy",
      "createdByUserType",
      "target",
      "createdAt",
    ];

    const updateData = { ...req.body };

    // Remove restricted fields
    restrictedFields.forEach((field) => {
      delete updateData[field];
    });

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "fullName email mobile profilePhotoUrl")
      .populate("assignedTo", "fullName email mobile profilePhotoUrl");

    // Log activity (non-blocking)
    logActivity(
      userId,
      "job_updated",
      jobId,
      "Job",
      `Job updated: ${job.workTitle}`,
      {
        jobTitle: job.workTitle,
        fieldsUpdated: Object.keys(updateData),
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating job",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 DELETE JOB
// ==========================================

export const deleteJob = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate job ID
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Only job creator can delete
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete jobs you created",
      });
    }

    await Job.findByIdAndDelete(jobId);

    // Log activity (non-blocking)
    logActivity(
      userId,
      "job_deleted",
      jobId,
      "Job",
      `Job deleted: ${job.workTitle}`,
      { jobTitle: job.workTitle },
      req
    ).catch(err => console.error("Activity logging error:", err));

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting job",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 APPLY TO JOB (Interested to work)
// ==========================================

export const applyToJob = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;
    const { interest, message } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate job ID
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Cannot apply to own job
    if (job.createdBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own job",
      });
    }

    // Check if already assigned
    if (job.assignedTo.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    // Add user to assigned list
    job.assignedTo.push(userId);
    job.totalApplications = (job.totalApplications || 0) + 1;
    await job.save();

    // Populate and return
    await job.populate("assignedTo", "fullName email mobile profilePhotoUrl");

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      data: job,
    });
  } catch (error) {
    console.error("Apply to job error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while applying to job",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET JOB APPLICATIONS
// ==========================================

export const getJobApplications = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate job ID
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Only job creator can view applications
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view applications for your own jobs",
      });
    }

    // Get applications with pagination
    const skip = (page - 1) * limit;

    const applications = await Job.findById(jobId)
      .populate({
        path: "assignedTo",
        select: "fullName email mobile profilePhotoUrl rating totalReviews userType",
        skip: skip,
        limit: parseInt(limit),
      });

    const total = job.assignedTo.length;

    res.status(200).json({
      success: true,
      message: "Job applications fetched successfully",
      data: {
        applications: applications.assignedTo,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get job applications error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching applications",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 SELECT WORKER FOR JOB
// ==========================================

export const selectWorker = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;
    const { workerId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: "Please provide worker ID",
      });
    }

    // Validate IDs
    if (
      !jobId.match(/^[0-9a-fA-F]{24}$/) ||
      !workerId.match(/^[0-9a-fA-F]{24}$/)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID or worker ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Only job creator can select workers
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only select workers for your own jobs",
      });
    }

    // Check if worker has applied
    if (!job.assignedTo.includes(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Worker has not applied for this job",
      });
    }

    // Check if already selected
    const alreadySelected = job.selectedWorkers.some(
      (sw) => sw.workerId.toString() === workerId
    );

    if (alreadySelected) {
      return res.status(400).json({
        success: false,
        message: "Worker is already selected for this job",
      });
    }

    // Add to selected workers
    job.selectedWorkers.push({
      workerId: workerId,
      acceptedAt: new Date(),
    });

    // Update job status if first worker selected
    if (job.status === "open" && job.selectedWorkers.length > 0) {
      job.status = "in_progress";
    }

    await job.save();

    // Log activity (non-blocking)
    logActivity(
      userId,
      "worker_selected",
      jobId,
      "Job",
      `Worker selected for job: ${job.workTitle}`,
      {
        jobTitle: job.workTitle,
        workerId: workerId,
        totalWorkers: job.selectedWorkers.length,
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    // Populate and return
    await job.populate(
      "selectedWorkers.workerId",
      "fullName email mobile profilePhotoUrl"
    );

    res.status(200).json({
      success: true,
      message: "Worker selected successfully",
      data: job,
    });
  } catch (error) {
    console.error("Select worker error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while selecting worker",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 COMPLETE JOB
// ==========================================

export const completeJob = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate job ID
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const isCreator = job.createdBy.toString() === userId;
    const isSelectedWorker = job.selectedWorkers.some(
      (worker) => worker.workerId?.toString() === userId
    );

    // Allow only creator or selected worker to mark completion
    if (!isCreator && !isSelectedWorker) {
      return res.status(403).json({
        success: false,
        message: "Only job creator or selected worker can mark this job as completed",
      });
    }

    if (job.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Job is already completed",
      });
    }

    // If selected worker is marking complete, record their completion timestamp
    if (isSelectedWorker) {
      const workerIndex = job.selectedWorkers.findIndex(
        (worker) => worker.workerId?.toString() === userId
      );

      if (workerIndex !== -1 && !job.selectedWorkers[workerIndex].completedAt) {
        job.selectedWorkers[workerIndex].completedAt = new Date();
      }
    }

    job.status = "completed";
    job.completedAt = new Date();
    await job.save();

    // Keep user job history in sync so accepted items move to completed buckets.
    const completionDate = new Date();
    await UserJobHistory.updateMany(
      {
        jobId: job._id,
        status: "accepted",
      },
      {
        $set: {
          status: "completed",
          isActive: false,
          "timeline.completedAt": completionDate,
        },
      }
    );

    // Log activity (non-blocking)
    logActivity(
      userId,
      "job_completed",
      jobId,
      "Job",
      `Job completed: ${job.workTitle}`,
      {
        jobTitle: job.workTitle,
        selectedWorkers: job.selectedWorkers.length,
        completedBy: isCreator ? "creator" : "worker",
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    await job.populate(
      "selectedWorkers.workerId",
      "fullName email mobile profilePhotoUrl"
    );

    res.status(200).json({
      success: true,
      message: `Job marked as completed by ${isCreator ? "creator" : "selected worker"}`,
      data: job,
    });
  } catch (error) {
    console.error("Complete job error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while completing job",
      error: error.message,
    });
  }
};

// ==========================================
// 🔄 TOGGLE JOB ACTIVATION (Active/Inactive)
// ==========================================

export const toggleJobActivation = async (req, res) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;

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

    // Find job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check authorization - only job creator can toggle
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only toggle activation for your own jobs",
      });
    }

    // If trying to activate the job
    if (!job.visibility) {
      // Check if user already has 5 active jobs
      const activeJobsCount = await Job.countDocuments({
        createdBy: userId,
        status: "open",
        visibility: true,
      });

      if (activeJobsCount >= 5) {
        return res.status(400).json({
          success: false,
          message: `You have already shown ${activeJobsCount} jobs. Maximum 5 active jobs allowed at a time. Please deactivate one of your active jobs to make this job visible.`,
          activeJobs: activeJobsCount,
          maxActiveJobs: 5,
          suggestion: "Go to 'My Jobs' and deactivate one of your active jobs, then try again.",
        });
      }
    }

    // Toggle visibility
    job.visibility = !job.visibility;
    await job.save();

    const action = job.visibility ? "activated" : "deactivated";

    // Log activity (non-blocking)
    logActivity(
      userId,
      `job_${action}`,
      jobId,
      "Job",
      `Job ${action}: ${job.workTitle}`,
      {
        jobTitle: job.workTitle,
        isActive: job.visibility,
      },
      req
    ).catch(err => console.error("Activity logging error:", err));

    await job.populate("createdBy", "fullName email mobile profilePhotoUrl");

    res.status(200).json({
      success: true,
      message: `Job ${action} successfully`,
      data: {
        jobId: job._id,
        workTitle: job.workTitle,
        isActive: job.visibility,
        status: job.status,
        message: job.visibility
          ? "Job is now active and visible to applicants"
          : "Job is now deactivated and hidden from applicants",
      },
    });
  } catch (error) {
    console.error("Toggle job activation error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while toggling job activation",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET APPLICATIONS FOR A JOB
// GET /api/jobs/getApplication?jobId=xxx  (or /api/jobs/:jobId/getApplication)
// Only the job creator can access this.
// Returns total count + full applicant details.
// ==========================================

export const getApplicationsForJob = async (req, res) => {
  try {
    const userId = req.userId;

    // Accept jobId from query param or route param
    const jobId = req.query.jobId || req.params.jobId;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "jobId is required. Pass it as a query param: ?jobId=<id>",
      });
    }

    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid jobId format",
      });
    }

    // Fetch the job
    const job = await Job.findById(jobId).select(
      "workTitle description status createdBy workersNeeded estimatedBudget budgetType location requiredSkills images target createdAt"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Only the job creator can view applications
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view applications for jobs you posted.",
      });
    }

    // Pagination
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    // Optional filter by status
    const enquiryFilter = { jobId };
    if (req.query.status) {
      enquiryFilter.status = req.query.status; // pending | accepted | rejected | withdrawn
    }

    const [applications, totalCount] = await Promise.all([
      JobEnquiry.find(enquiryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "userId",
          "fullName email mobile profilePhotoUrl rating totalReviews skills experience userType location availability completedJobs"
        ),
      JobEnquiry.countDocuments(enquiryFilter),
    ]);

    // Count breakdown by status
    const [pending, accepted, rejected, withdrawn] = await Promise.all([
      JobEnquiry.countDocuments({ jobId, status: "pending" }),
      JobEnquiry.countDocuments({ jobId, status: "accepted" }),
      JobEnquiry.countDocuments({ jobId, status: "rejected" }),
      JobEnquiry.countDocuments({ jobId, status: "withdrawn" }),
    ]);

    // Shape each application for clean response
    const applicationList = applications.map((enq) => ({
      enquiryId:       enq._id,
      status:          enq.status,
      message:         enq.message,
      appliedAt:       enq.createdAt,
      acceptedAt:      enq.acceptedAt  || null,
      rejectedAt:      enq.rejectedAt  || null,
      rejectionReason: enq.rejectionReason || null,
      notes:           enq.notes || null,
      applicant: enq.userId
        ? {
            userId:        enq.userId._id,
            name:          enq.userId.fullName,
            email:         enq.userId.email,
            mobile:        enq.userId.mobile,
            profilePhoto:  enq.userId.profilePhotoUrl || null,
            userType:      enq.userId.userType,
            rating:        enq.userId.rating,
            totalReviews:  enq.userId.totalReviews,
            skills:        enq.userId.skills || [],
            experience:    enq.userId.experience || null,
            completedJobs: enq.userId.completedJobs,
            availability:  enq.userId.availability,
            location: enq.userId.location
              ? {
                  city:  enq.userId.location.city,
                  state: enq.userId.location.state,
                  area:  enq.userId.location.area,
                }
              : null,
          }
        : enq.userDetails, // fallback to snapshot if user deleted
    }));

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      data: {
        job: {
          jobId:           job._id,
          workTitle:       job.workTitle,
          status:          job.status,
          workersNeeded:   job.workersNeeded,
          estimatedBudget: job.estimatedBudget,
          budgetType:      job.budgetType,
          requiredSkills:  job.requiredSkills,
          images:          job.images || [],
          location:        job.location,
          target:          job.target,
          postedAt:        job.createdAt,
        },
        summary: {
          total:     totalCount,
          pending,
          accepted,
          rejected,
          withdrawn,
        },
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        applications: applicationList,
      },
    });
  } catch (error) {
    console.error("getApplicationsForJob error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET ALL APPLIED JOBS
// GET /api/jobs/getallappliedjobs
// Returns all jobs the current user has applied to (via JobEnquiry).
// Filters: status (pending|accepted|rejected|withdrawn|completed), search, page, limit
// ==========================================

export const getAllAppliedJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, search, page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId).select("userType");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Build enquiry filter — default to pending
    const filter = { userId };
    filter.status = status || "pending";

    // Pagination
    const parsedPage  = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    const [enquiries, totalCount] = await Promise.all([
      JobEnquiry.find(filter)
        .populate({
          path: "jobId",
          select:
            "workTitle description location workersNeeded requiredSkills estimatedBudget budgetType deadline expectedStartDate duration status images workType category priority totalApplications createdAt",
          match: search
            ? { workTitle: { $regex: search, $options: "i" } }
            : undefined,
        })
        .populate(
          "postedBy",
          "fullName email mobile profilePhotoUrl userType companyName rating completedJobs location"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      JobEnquiry.countDocuments(filter),
    ]);

    // Filter out null jobId (deleted jobs)
    const validEnquiries = enquiries.filter((e) => e.jobId !== null);

    // Status-wise count for the user
    const [pending, accepted, rejected, withdrawn, completed] = await Promise.all([
      JobEnquiry.countDocuments({ userId, status: "pending" }),
      JobEnquiry.countDocuments({ userId, status: "accepted" }),
      JobEnquiry.countDocuments({ userId, status: "rejected" }),
      JobEnquiry.countDocuments({ userId, status: "withdrawn" }),
      JobEnquiry.countDocuments({ userId, status: "completed" }),
    ]);

    const appliedJobs = validEnquiries.map((enq) => ({
      enquiryId:       enq._id,
      applicationStatus: enq.status,
      message:         enq.message,
      appliedAt:       enq.createdAt,
      acceptedAt:      enq.acceptedAt  || null,
      rejectedAt:      enq.rejectedAt  || null,
      completedAt:     enq.completedAt || null,
      rejectionReason: enq.rejectionReason || null,
      job: {
        jobId:           enq.jobId._id,
        workTitle:       enq.jobId.workTitle,
        description:     enq.jobId.description,
        workType:        enq.jobId.workType,
        category:        enq.jobId.category,
        priority:        enq.jobId.priority,
        requiredSkills:  enq.jobId.requiredSkills,
        workersNeeded:   enq.jobId.workersNeeded,
        estimatedBudget: enq.jobId.estimatedBudget,
        budgetType:      enq.jobId.budgetType,
        deadline:        enq.jobId.deadline,
        expectedStartDate: enq.jobId.expectedStartDate,
        duration:        enq.jobId.duration,
        images:          enq.jobId.images || [],
        location: {
          city:    enq.jobId.location?.city,
          state:   enq.jobId.location?.state,
          area:    enq.jobId.location?.area,
          pincode: enq.jobId.location?.pincode,
          address: enq.jobId.location?.address,
        },
        totalApplications: enq.jobId.totalApplications,
        jobStatus:       enq.jobId.status,
        postedAt:        enq.jobId.createdAt,
      },
      postedBy: enq.postedBy
        ? {
            userId:       enq.postedBy._id,
            name:         enq.postedBy.fullName,
            companyName:  enq.postedBy.companyName || null,
            email:        enq.postedBy.email,
            mobile:       enq.postedBy.mobile,
            profilePhoto: enq.postedBy.profilePhotoUrl || null,
            userType:     enq.postedBy.userType,
            rating:       enq.postedBy.rating,
            completedJobs: enq.postedBy.completedJobs,
            location: enq.postedBy.location
              ? { city: enq.postedBy.location.city, state: enq.postedBy.location.state }
              : null,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Applied jobs fetched successfully",
      data: {
        userType: user.userType,
        summary: { total: totalCount, pending, accepted, rejected, withdrawn, completed },
        pagination: {
          total: totalCount,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalCount / parsedLimit),
        },
        appliedJobs,
      },
    });
  } catch (error) {
    console.error("getAllAppliedJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applied jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET ALL ACCEPTED JOBS
// GET /api/jobs/getallacceptedjobs
// Returns jobs where the user's application status is "accepted".
// ==========================================

export const getAllAcceptedJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const { search, page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId).select("userType");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filter = { userId, status: "accepted" };

    const parsedPage  = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    const [enquiries, totalCount] = await Promise.all([
      JobEnquiry.find(filter)
        .populate({
          path: "jobId",
          select:
            "workTitle description location workersNeeded requiredSkills estimatedBudget budgetType deadline expectedStartDate duration status images workType category priority totalApplications createdAt",
          match: search
            ? { workTitle: { $regex: search, $options: "i" } }
            : undefined,
        })
        .populate(
          "postedBy",
          "fullName email mobile profilePhotoUrl userType companyName rating completedJobs location"
        )
        .sort({ acceptedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      JobEnquiry.countDocuments(filter),
    ]);

    const validEnquiries = enquiries.filter((e) => e.jobId !== null);

    const acceptedJobs = validEnquiries.map((enq) => ({
      enquiryId:       enq._id,
      applicationStatus: enq.status,
      message:         enq.message,
      appliedAt:       enq.createdAt,
      acceptedAt:      enq.acceptedAt || null,
      job: {
        jobId:           enq.jobId._id,
        workTitle:       enq.jobId.workTitle,
        description:     enq.jobId.description,
        workType:        enq.jobId.workType,
        category:        enq.jobId.category,
        priority:        enq.jobId.priority,
        requiredSkills:  enq.jobId.requiredSkills,
        workersNeeded:   enq.jobId.workersNeeded,
        estimatedBudget: enq.jobId.estimatedBudget,
        budgetType:      enq.jobId.budgetType,
        deadline:        enq.jobId.deadline,
        expectedStartDate: enq.jobId.expectedStartDate,
        duration:        enq.jobId.duration,
        images:          enq.jobId.images || [],
        location: {
          city:    enq.jobId.location?.city,
          state:   enq.jobId.location?.state,
          area:    enq.jobId.location?.area,
          pincode: enq.jobId.location?.pincode,
          address: enq.jobId.location?.address,
        },
        totalApplications: enq.jobId.totalApplications,
        jobStatus:       enq.jobId.status,
        postedAt:        enq.jobId.createdAt,
      },
      postedBy: enq.postedBy
        ? {
            userId:       enq.postedBy._id,
            name:         enq.postedBy.fullName,
            companyName:  enq.postedBy.companyName || null,
            email:        enq.postedBy.email,
            mobile:       enq.postedBy.mobile,
            profilePhoto: enq.postedBy.profilePhotoUrl || null,
            userType:     enq.postedBy.userType,
            rating:       enq.postedBy.rating,
            completedJobs: enq.postedBy.completedJobs,
            location: enq.postedBy.location
              ? { city: enq.postedBy.location.city, state: enq.postedBy.location.state }
              : null,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Accepted jobs fetched successfully",
      data: {
        userType: user.userType,
        total: totalCount,
        pagination: {
          total: totalCount,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalCount / parsedLimit),
        },
        acceptedJobs,
      },
    });
  } catch (error) {
    console.error("getAllAcceptedJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch accepted jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET ALL COMPLETED JOBS
// GET /api/jobs/getallcompletedjobs
// Returns jobs where the user's application status is "completed".
// Includes the review/rating given by the contractor.
// ==========================================

export const getAllCompletedJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const { search, page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId).select("userType");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filter = { userId, status: "completed" };

    const parsedPage  = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    const [enquiries, totalCount] = await Promise.all([
      JobEnquiry.find(filter)
        .populate({
          path: "jobId",
          select:
            "workTitle description location workersNeeded requiredSkills estimatedBudget budgetType deadline expectedStartDate duration status images workType category priority totalApplications createdAt",
          match: search
            ? { workTitle: { $regex: search, $options: "i" } }
            : undefined,
        })
        .populate(
          "postedBy",
          "fullName email mobile profilePhotoUrl userType companyName rating completedJobs location"
        )
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      JobEnquiry.countDocuments(filter),
    ]);

    const validEnquiries = enquiries.filter((e) => e.jobId !== null);

    // Fetch reviews for these completed enquiries in one query
    const jobIds = validEnquiries.map((e) => e.jobId._id);
    const reviews = await import("../models/UserReview.js").then((m) =>
      m.default.find({
        jobId: { $in: jobIds },
        $or: [
          { userId: userId },       // reviews received by the worker (contractor_review)
          { reviewedBy: userId },    // reviews given by the worker (worker_review)
        ],
      }).select("jobId userId reviewedBy rating feedback ratingDetails reviewType createdAt").lean()
    );

    // Organize reviews: contractor's review of worker vs worker's feedback for contractor
    const contractorReviewMap = new Map();
    const myFeedbackMap = new Map();
    for (const r of reviews) {
      const key = r.jobId.toString();
      if (r.reviewType === "contractor_review") {
        contractorReviewMap.set(key, r);
      } else if (r.reviewType === "worker_review") {
        myFeedbackMap.set(key, r);
      }
    }

    const completedJobs = validEnquiries.map((enq) => {
      const jobKey = enq.jobId._id.toString();
      const contractorReview = contractorReviewMap.get(jobKey) || null;
      const myFeedback = myFeedbackMap.get(jobKey) || null;
      return {
        enquiryId:       enq._id,
        applicationStatus: enq.status,
        message:         enq.message,
        appliedAt:       enq.createdAt,
        acceptedAt:      enq.acceptedAt  || null,
        completedAt:     enq.completedAt || null,
        job: {
          jobId:           enq.jobId._id,
          workTitle:       enq.jobId.workTitle,
          description:     enq.jobId.description,
          workType:        enq.jobId.workType,
          category:        enq.jobId.category,
          priority:        enq.jobId.priority,
          requiredSkills:  enq.jobId.requiredSkills,
          workersNeeded:   enq.jobId.workersNeeded,
          estimatedBudget: enq.jobId.estimatedBudget,
          budgetType:      enq.jobId.budgetType,
          deadline:        enq.jobId.deadline,
          expectedStartDate: enq.jobId.expectedStartDate,
          duration:        enq.jobId.duration,
          images:          enq.jobId.images || [],
          location: {
            city:    enq.jobId.location?.city,
            state:   enq.jobId.location?.state,
            area:    enq.jobId.location?.area,
            pincode: enq.jobId.location?.pincode,
            address: enq.jobId.location?.address,
          },
          totalApplications: enq.jobId.totalApplications,
          jobStatus:       enq.jobId.status,
          postedAt:        enq.jobId.createdAt,
        },
        review: contractorReview
          ? {
              rating:        contractorReview.rating,
              feedback:      contractorReview.feedback,
              ratingDetails: contractorReview.ratingDetails,
              reviewedAt:    contractorReview.createdAt,
            }
          : null,
        myFeedback: myFeedback
          ? {
              rating:        myFeedback.rating,
              feedback:      myFeedback.feedback,
              ratingDetails: myFeedback.ratingDetails,
              submittedAt:   myFeedback.createdAt,
            }
          : null,
        feedbackSubmitted: !!myFeedback,
        postedBy: enq.postedBy
          ? {
              userId:       enq.postedBy._id,
              name:         enq.postedBy.fullName,
              companyName:  enq.postedBy.companyName || null,
              email:        enq.postedBy.email,
              mobile:       enq.postedBy.mobile,
              profilePhoto: enq.postedBy.profilePhotoUrl || null,
              userType:     enq.postedBy.userType,
              rating:       enq.postedBy.rating,
              completedJobs: enq.postedBy.completedJobs,
              location: enq.postedBy.location
                ? { city: enq.postedBy.location.city, state: enq.postedBy.location.state }
                : null,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Completed jobs fetched successfully",
      data: {
        userType: user.userType,
        total: totalCount,
        pagination: {
          total: totalCount,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalCount / parsedLimit),
        },
        completedJobs,
      },
    });
  } catch (error) {
    console.error("getAllCompletedJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch completed jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET ALL JOBS FOR APPLICANTS
// GET /api/jobs/getalljobs
// Only for: labour, sub_contractor
// Shows jobs where target[] includes the caller's userType.
// Each job includes: have I already applied? (myApplication)
// Filters: search, skills, location, city, state, budgetMin, budgetMax,
//          budgetType, sort (newest|oldest|budget_high|budget_low)
// ==========================================

export const getAllJobsForApplicant = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("userType");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Only labour and sub_contractor can use this feed
    if (!["labour", "sub_contractor"].includes(user.userType)) {
      return res.status(403).json({
        success: false,
        message: "This feed is only available for labour and sub-contractor accounts",
      });
    }

    const {
      search,
      skills,
      city,
      state,
      location,
      budgetMin,
      budgetMax,
      budgetType,
      sort = "newest",
      page  = 1,
      limit = 10,
    } = req.query;

    // --- Base filter: open, visible, target includes caller's userType ---
    const filter = {
      status: "open",
      visibility: true,
      target: user.userType,
      createdBy: { $ne: userId },
    };

    // --- Exclude jobs the user has already applied to ---
    const appliedEnquiries = await JobEnquiry.find({
      userId,
      status: { $in: ["pending", "accepted", "completed"] },
    }).select("jobId").lean();

    const appliedJobIds = appliedEnquiries.map((e) => e.jobId);
    if (appliedJobIds.length > 0) {
      filter._id = { $nin: appliedJobIds };
    }

    // --- Search on title or description ---
    if (search) {
      filter.$or = [
        { workTitle:    { $regex: search, $options: "i" } },
        { description:  { $regex: search, $options: "i" } },
        { requiredDetails: { $regex: search, $options: "i" } },
      ];
    }

    // --- Skills filter (match any) ---
    if (skills) {
      const skillsArr = Array.isArray(skills) ? skills : skills.split(",").map((s) => s.trim());
      filter.requiredSkills = { $in: skillsArr };
    }

    // --- Location filter ---
    if (city)     filter["location.city"]  = { $regex: city,  $options: "i" };
    if (state)    filter["location.state"] = { $regex: state, $options: "i" };
    if (location) filter["location.city"]  = { $regex: location, $options: "i" }; // fallback alias

    // --- Budget filter ---
    if (budgetMin || budgetMax) {
      filter.estimatedBudget = {};
      if (budgetMin) filter.estimatedBudget.$gte = Number(budgetMin);
      if (budgetMax) filter.estimatedBudget.$lte = Number(budgetMax);
    }
    if (budgetType) filter.budgetType = budgetType; // fixed | hourly | daily

    // --- Sort ---
    const sortMap = {
      newest:      { createdAt: -1 },
      oldest:      { createdAt:  1 },
      budget_high: { estimatedBudget: -1 },
      budget_low:  { estimatedBudget:  1 },
    };
    const sortOption = sortMap[sort] || sortMap.newest;

    // --- Pagination ---
    const parsedPage  = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    // --- Fetch jobs + total count in parallel ---
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate(
          "createdBy",
          "fullName email mobile profilePhotoUrl userType companyName rating completedJobs location"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    if (jobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No jobs found matching your criteria",
        data: { jobs: [], appliedJobsExcluded: appliedJobIds.length, pagination: { total: 0, page: parsedPage, limit: parsedLimit, totalPages: 0 } },
      });
    }

    // --- Shape response ---
    const jobList = jobs.map((job) => {
      return {
        jobId:           job._id,
        workTitle:       job.workTitle,
        description:     job.description,
        workType:        job.workType,
        category:        job.category,
        priority:        job.priority,
        requiredSkills:  job.requiredSkills,
        requiredDetails: job.requiredDetails,
        workersNeeded:   job.workersNeeded,
        estimatedBudget: job.estimatedBudget,
        budgetType:      job.budgetType,
        deadline:        job.deadline,
        expectedStartDate: job.expectedStartDate,
        duration:        job.duration,
        images:          job.images || [],
        location: {
          city:    job.location?.city,
          state:   job.location?.state,
          area:    job.location?.area,
          pincode: job.location?.pincode,
          address: job.location?.address,
        },
        totalApplications: job.totalApplications,
        status:           job.status,
        postedAt:         job.createdAt,

        // Creator info
        postedBy: job.createdBy
          ? {
              userId:       job.createdBy._id,
              name:         job.createdBy.fullName,
              companyName:  job.createdBy.companyName || null,
              profilePhoto: job.createdBy.profilePhotoUrl || null,
              userType:     job.createdBy.userType,
              rating:       job.createdBy.rating,
              completedJobs: job.createdBy.completedJobs,
              location: job.createdBy.location
                ? { city: job.createdBy.location.city, state: job.createdBy.location.state }
                : null,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      data: {
        userType: user.userType,
        appliedJobsExcluded: appliedJobIds.length,
        filters: { search, skills, city, state, budgetMin, budgetMax, budgetType, sort },
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
        jobs: jobList,
      },
    });
  } catch (error) {
    console.error("getAllJobsForApplicant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};
