import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    // Job Details
    workTitle: {
      type: String,
      required: [true, "Please provide a work title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide job description"],
    },

    // Target Audience (auto-set based on createdBy userType)
    // Contractor → ["labour", "sub_contractor"]
    // Sub-contractor → ["labour"]
    target: {
      type: [String],
      enum: ["labour", "contractor", "sub_contractor"],
      default: [],
    },

    // Location
    location: {
      city: String,
      state: String,
      area: String,
      pincode: String,
      address: {
        type: String,
        required: [true, "Please provide location address"],
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },

    // Job Requirements
    workersNeeded: {
      type: Number,
      required: [true, "Please specify number of workers needed"],
      min: 1,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    requiredDetails: {
      type: String,
      default: "",
    },

    // Documents
    supportDocuments: {
      type: [String], // URLs of uploaded documents
      default: [],
    },

    // Pricing & Timeline
    estimatedBudget: {
      type: Number,
      default: null,
    },
    budgetType: {
      type: String,
      enum: ["fixed", "hourly", "daily"], // hourly, daily, project-based
      default: "fixed",
    },
    deadline: Date,
    expectedStartDate: Date,
    duration: {
      value: Number,
      unit: String, // hours, days, weeks
    },

    // Job Status
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "closed", "cancelled"],
      default: "open",
    },
    completedAt: Date,

    // Created By & Assigned
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByUserType: {
      type: String,
      enum: ["labour", "contractor", "sub_contractor"],
      required: true,
    },

    // Assigned Worker/Team
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Job Metadata
    totalApplications: {
      type: Number,
      default: 0,
    },
    selectedWorkers: [
      {
        workerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        acceptedAt: Date,
        completedAt: Date,
      },
    ],

    // Additional Fields
    workType: {
      type: String,
      default: "", // e.g., "construction", "plumbing", "electrical"
    },
    category: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    visibility: {
      type: Boolean,
      default: true, // Can be hidden by contractor
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Tracking
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Create geospatial index for location-based queries
jobSchema.index({ "location.coordinates": "2dsphere" });
jobSchema.index({ createdBy: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ target: 1 });

export default mongoose.model("Job", jobSchema);
