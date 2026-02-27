import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    fullName: String,
    email: String,
    password: {
      type: String,
      select: false,
    },
    mobile: String,

    // User Type (Labour or Contractor)
    userType: String,

    // Professional Information
    age: Number,
    experience: String,
    experienceRange: String, // e.g., "0-1 years", "1-3 years", "3-5 years", "5+ years"
    bio: String,
    teamSize: String,
    termsAgreed:{type:Boolean, default:false},
    skills: [String],
    coverageArea:[String],
    servicesOffered: [String],
    serviceCover: [String], // e.g., "local", "statewide", "national", "international"

    // Location & Work Information
    location: {
      city: String,
      state: String,
      pincode: String,
      address: String,
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

    workTypes: [String],
    workingHours: {
      type: String,
      default: "flexible",
    },

    // Media
    profilePhotoUrl: String,
    // Status & Verification
    status: {
      type: String,
      default: "active",
    },
    display: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },

    // Additional Information
    rating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },

    // Contractor Specific
    companyName: String,
    aboutCompany: String,
    about:String,
    gstNumber: String,
    registrationNumber: String,
    // Labour Specific
    aadharNumber: String,
    businessLicenseUrl:String,
    businessName:String,
    businessType:[String],
    companyLogoUrl:String,

    // Banking Information
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },

    // Additional Fields
    availability: {
      type: Boolean,
      default: true,
    },
    preferredLanguages: [String],

    // Documents reference (stored separately in Document collection)
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],

    // Password reset & Email verification
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // Device & Login Info
    lastLogin: Date,
    deviceTokens: [String],

    // Metadata
    isOnline: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,

    // Pricing & Rates
    hourlyRate: Number,
    dayRate: Number,
    projectRate: Number,
    minimumJobValue: Number,

    // Service Information
    serviceCategories: [String],
    serviceRadius: Number, // in km
    preferredContactMethod: String, // call, sms, email, whatsapp

    // Portfolio & Projects
    portfolioProjects: [
      {
        title: String,
        description: String,
        imageUrl: String,
        projectLink: String,
        completionDate: Date,
      },
    ],

    // Certifications & Qualifications
    certifications: [
      {
        certificateName: String,
        issuingAuthority: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String,
      },
    ],

    // Performance Metrics
    averageResponseTime: Number, // in hours
    acceptanceRate: Number,
    cancellationRate: Number,
    onTimeCompletionRate: Number,

    // Earnings & Payments
    totalEarnings: {
      type: Number,
      default: 0,
    },
    pendingEarnings: {
      type: Number,
      default: 0,
    },
    withdrawnEarnings: {
      type: Number,
      default: 0,
    },

    // Verification Details
    aadharVerified: {
      type: Boolean,
      default: false,
    },
    panVerified: {
      type: Boolean,
      default: false,
    },
    licenseVerified: {
      type: Boolean,
      default: false,
    },

    // PAN & Tax Information
    panNumber: String,

    // Contractor Specific - Insurance
    insuranceDetails: {
      providerName: String,
      policyNumber: String,
      coverageAmount: Number,
      expiryDate: Date,
      documentUrl: String,
    },

    // Subscription Plan
    subscriptionPlan: String, // basic, premium, pro
    planExpiryDate: Date,
    planStartDate: Date,

    // Social & Referral
    socialLinks: {
      linkedin: String,
      twitter: String,
      facebook: String,
      instagram: String,
      portfolio: String,
    },
    referralCode: String,
    referrerId: mongoose.Schema.Types.ObjectId,
    referralCount: {
      type: Number,
      default: 0,
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      relationship: String,
      phoneNumber: String,
    },

    // Additional Notes
    adminNotes: String,
    blockReason: String,
  },
  {
    timestamps: true,
  },
);

// Index for geospatial queries
userSchema.index({ "location.coordinates": "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to get public profile (exclude sensitive data)
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpire;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
