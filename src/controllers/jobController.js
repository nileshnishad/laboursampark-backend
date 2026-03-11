import Job from "../models/Job.js";
import User from "../models/User.js";

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
    };

    // Create and save job
    const job = new Job(jobData);
    await job.save();

    // Populate creator details
    await job.populate("createdBy", "fullName email mobile profilePhotoUrl");

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
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
    let filter = { status: status || "open" };

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
      // Labour can see jobs from both Contractor and Sub-contractor
      filter.$or = [
        { target: "labour" },
        { createdBy: userId }, // Can see own jobs
      ];
    } else if (user.userType === "contractor") {
      // Contractor can ONLY see own posted jobs (cannot see sub-contractor or other contractor jobs)
      filter.createdBy = userId;
    } else if (user.userType === "sub_contractor") {
      // Sub-contractor can see contractor jobs and own jobs (NOT other sub-contractor jobs)
      filter.$or = [
        { target: "sub_contractor", createdByUserType: "contractor" },
        { createdBy: userId }, // Can see own jobs
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

    // Only job creator can mark as complete
    if (job.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only complete your own jobs",
      });
    }

    job.status = "completed";
    await job.save();

    await job.populate(
      "selectedWorkers.workerId",
      "fullName email mobile profilePhotoUrl"
    );

    res.status(200).json({
      success: true,
      message: "Job marked as completed",
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
