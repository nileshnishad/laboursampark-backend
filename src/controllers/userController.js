import User from "../models/User.js";
import jwt from "jsonwebtoken";

// Register User
export const register = async (req, res) => {
  console.log("register lkog");
  
  try {
 
    
    const { fullName, email, password, mobile, userType } = req.body;
      

    // Validation
    if (!fullName || !email || !password || !mobile || !userType) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: fullName, email, password, mobile, userType",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email or mobile number already exists",
      });
    }

    // Validate userType
    const validUserTypes = ["labour", "contractor"];
    if (!validUserTypes.includes(userType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "userType must be either 'labour' or 'contractor'",
      });
    }

    // Create new user with all fields from payload
    const userData = {
      ...req.body,
      userType: userType.toLowerCase(),
    };

    const user = new User(userData);

    // Save user (password will be hashed by pre-save hook)
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: user.toJSON()
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration",
      error: error.message,
    });
  }
};

// Login User
export const login = async (req, res) => {
  try {
    const { email, mobile, password, otp, userType } = req.body;

    // Validation - at least one identifier (email or mobile) required
    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please provide either email or mobile number",
      });
    }

    // Validation - at least one auth method (password or otp) required
    if (!password && !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide either password or OTP",
      });
    }

    // Validate userType
    const validUserTypes = ["labour", "contractor"];
    if (userType && !validUserTypes.includes(userType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "userType must be either 'labour' or 'contractor'",
      });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [
        email && { email },
        mobile && { mobile },
      ].filter(Boolean),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please check your email/mobile and try again",
      });
    }

    // Verify userType if provided
    if (userType && user.userType !== userType.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as '${user.userType}', but you're trying to login as '${userType.toLowerCase()}'`,
      });
    }

    // Authentication with password
    if (password) {
      const isPasswordValid = await user.matchPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }
    }
    // Authentication with OTP
    else if (otp) {
      // Check if OTP matches and is not expired
      if (!user.emailVerificationToken || user.emailVerificationToken !== otp) {
        return res.status(401).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      if (user.emailVerificationExpire && new Date() > user.emailVerificationExpire) {
        return res.status(401).json({
          success: false,
          message: "OTP has expired. Please request a new one",
        });
      }

      // Clear OTP after successful verification
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      user.emailVerified = true;
      await user.save();
    }

    // Generate JWT token with userType included
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Prepare comprehensive user data
    const userData = user.toJSON();

    const responseData = {
      // Authentication & Basic Info
      _id: userData._id,
      fullName: userData.fullName,
      email: userData.email,
      mobile: userData.mobile,
      userType: userData.userType,

      // Profile & Media
      profilePhotoUrl: userData.profilePhotoUrl,
      display: userData.display,

      // Professional Information
      age: userData.age,
      experience: userData.experience,
      experienceRange: userData.experienceRange,
      bio: userData.bio,
      skills: userData.skills,
      about: userData.about,

      // Location Information
      location: userData.location,

      // Work Information
      workTypes: userData.workTypes,
      workingHours: userData.workingHours,
      serviceCategories: userData.serviceCategories,
      serviceCover: userData.serviceCover,
      servicesOffered: userData.servicesOffered,
      coverageArea: userData.coverageArea,
      serviceRadius: userData.serviceRadius,

      // Ratings & Reviews
      rating: userData.rating,
      totalReviews: userData.totalReviews,
      completedJobs: userData.completedJobs,

      // Verification Status
      isVerified: userData.isVerified,
      emailVerified: userData.emailVerified,
      mobileVerified: userData.mobileVerified,
      aadharVerified: userData.aadharVerified,
      panVerified: userData.panVerified,
      licenseVerified: userData.licenseVerified,

      // Contractor Specific
      companyName: userData.companyName,
      aboutCompany: userData.aboutCompany,
      gstNumber: userData.gstNumber,
      registrationNumber: userData.registrationNumber,
      companyLogoUrl: userData.companyLogoUrl,
      businessLicenseUrl: userData.businessLicenseUrl,

      // Labour Specific
      aadharNumber: userData.aadharNumber,
      businessName: userData.businessName,
      businessType: userData.businessType,

      // Banking Information
      bankDetails: userData.bankDetails,

      // Availability & Status
      availability: userData.availability,
      status: userData.status,
      isOnline: userData.isOnline,
      termsAgreed: userData.termsAgreed,

      // Rates & Pricing
      hourlyRate: userData.hourlyRate,
      dayRate: userData.dayRate,
      projectRate: userData.projectRate,
      minimumJobValue: userData.minimumJobValue,

      // Additional Information
      teamSize: userData.teamSize,
      preferredLanguages: userData.preferredLanguages,
      preferredContactMethod: userData.preferredContactMethod,

      // Portfolio & Certifications
      certifications: userData.certifications,
      portfolioProjects: userData.portfolioProjects,

      // Performance Metrics
      averageResponseTime: userData.averageResponseTime,
      acceptanceRate: userData.acceptanceRate,
      cancellationRate: userData.cancellationRate,
      onTimeCompletionRate: userData.onTimeCompletionRate,

      // Earnings
      totalEarnings: userData.totalEarnings,
      pendingEarnings: userData.pendingEarnings,
      withdrawnEarnings: userData.withdrawnEarnings,

      // Insurance (Contractor)
      insuranceDetails: userData.insuranceDetails,

      // Subscription
      subscriptionPlan: userData.subscriptionPlan,
      planExpiryDate: userData.planExpiryDate,
      planStartDate: userData.planStartDate,

      // Social & Referral
      socialLinks: userData.socialLinks,
      referralCode: userData.referralCode,
      referralCount: userData.referralCount,

      // Emergency Contact
      emergencyContact: userData.emergencyContact,

      // Metadata
      lastLogin: userData.lastLogin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: responseData,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
      error: error.message,
    });
  }
};

// ==========================================
// 👤 GET USER PROFILE
// ==========================================

export const getProfile = async (req, res) => {
  try {
    // Get userId from authenticated token (middleware extracts it)
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prepare comprehensive user profile data
    const userData = user.toJSON();

    const profileData = {
      // Authentication & Basic Info
      _id: userData._id,
      fullName: userData.fullName,
      email: userData.email,
      mobile: userData.mobile,
      userType: userData.userType,

      // Profile & Media
      profilePhotoUrl: userData.profilePhotoUrl,
      display: userData.display,

      // Professional Information
      age: userData.age,
      experience: userData.experience,
      experienceRange: userData.experienceRange,
      bio: userData.bio,
      skills: userData.skills,
      about: userData.about,

      // Location Information
      location: userData.location,

      // Work Information
      workTypes: userData.workTypes,
      workingHours: userData.workingHours,
      serviceCategories: userData.serviceCategories,
      serviceCover: userData.serviceCover,
      servicesOffered: userData.servicesOffered,
      coverageArea: userData.coverageArea,
      serviceRadius: userData.serviceRadius,

      // Ratings & Reviews
      rating: userData.rating,
      totalReviews: userData.totalReviews,
      completedJobs: userData.completedJobs,

      // Verification Status
      isVerified: userData.isVerified,
      emailVerified: userData.emailVerified,
      mobileVerified: userData.mobileVerified,
      aadharVerified: userData.aadharVerified,
      panVerified: userData.panVerified,
      licenseVerified: userData.licenseVerified,

      // Contractor Specific
      companyName: userData.companyName,
      aboutCompany: userData.aboutCompany,
      gstNumber: userData.gstNumber,
      registrationNumber: userData.registrationNumber,
      companyLogoUrl: userData.companyLogoUrl,
      businessLicenseUrl: userData.businessLicenseUrl,

      // Labour Specific
      aadharNumber: userData.aadharNumber,
      businessName: userData.businessName,
      businessType: userData.businessType,

      // Banking Information
      bankDetails: userData.bankDetails,

      // Availability & Status
      availability: userData.availability,
      status: userData.status,
      isOnline: userData.isOnline,
      termsAgreed: userData.termsAgreed,

      // Rates & Pricing
      hourlyRate: userData.hourlyRate,
      dayRate: userData.dayRate,
      projectRate: userData.projectRate,
      minimumJobValue: userData.minimumJobValue,

      // Additional Information
      teamSize: userData.teamSize,
      preferredLanguages: userData.preferredLanguages,
      preferredContactMethod: userData.preferredContactMethod,

      // Portfolio & Certifications
      certifications: userData.certifications,
      portfolioProjects: userData.portfolioProjects,

      // Performance Metrics
      averageResponseTime: userData.averageResponseTime,
      acceptanceRate: userData.acceptanceRate,
      cancellationRate: userData.cancellationRate,
      onTimeCompletionRate: userData.onTimeCompletionRate,

      // Earnings
      totalEarnings: userData.totalEarnings,
      pendingEarnings: userData.pendingEarnings,
      withdrawnEarnings: userData.withdrawnEarnings,

      // Insurance (Contractor)
      insuranceDetails: userData.insuranceDetails,

      // Subscription
      subscriptionPlan: userData.subscriptionPlan,
      planExpiryDate: userData.planExpiryDate,
      planStartDate: userData.planStartDate,

      // Social & Referral
      socialLinks: userData.socialLinks,
      referralCode: userData.referralCode,
      referralCount: userData.referralCount,

      // Emergency Contact
      emergencyContact: userData.emergencyContact,

      // Metadata
      lastLogin: userData.lastLogin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: profileData,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving profile",
      error: error.message,
    });
  }
};

// ==========================================
// ✏️ UPDATE USER PROFILE
// ==========================================

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const updateData = req.body;

    // Fields that cannot be updated
    const restrictedFields = ["_id", "password", "email", "mobile", "createdAt", "resetPasswordToken", "resetPasswordExpire", "emailVerificationToken", "emailVerificationExpire"];

    // Remove restricted fields from update
    restrictedFields.forEach(field => {
      delete updateData[field];
    });

    // If trying to change password, use dedicated endpoint
    if (updateData.password) {
      return res.status(400).json({
        success: false,
        message: "Use /api/users/change-password endpoint to update password",
      });
    }

    // If trying to change email or mobile, use dedicated endpoint
    if (updateData.email || updateData.mobile) {
      return res.status(400).json({
        success: false,
        message: "Email and mobile cannot be updated. Create new account if needed.",
      });
    }

    // Validate specific fields if provided
    if (updateData.age && (typeof updateData.age !== "number" || updateData.age < 0)) {
      return res.status(400).json({
        success: false,
        message: "Age must be a positive number",
      });
    }

    if (updateData.userType && !["labour", "contractor"].includes(updateData.userType)) {
      return res.status(400).json({
        success: false,
        message: "userType must be either 'labour' or 'contractor'",
      });
    }

    // Validate numeric fields
    const numericFields = ["rating", "totalReviews", "completedJobs", "hourlyRate", "dayRate", "projectRate", "minimumJobValue", "serviceRadius", "averageResponseTime", "acceptanceRate", "cancellationRate", "onTimeCompletionRate", "totalEarnings", "pendingEarnings", "withdrawnEarnings", "referralCount"];

    for (const field of numericFields) {
      if (updateData[field] !== undefined && typeof updateData[field] !== "number") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a number`,
        });
      }
    }

    // Validate boolean fields
    const booleanFields = ["display", "isVerified", "emailVerified", "mobileVerified", "aadharVerified", "panVerified", "licenseVerified", "availability", "isOnline", "termsAgreed"];

    for (const field of booleanFields) {
      if (updateData[field] !== undefined && typeof updateData[field] !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a boolean`,
        });
      }
    }

    // Validate status field
    if (updateData.status && !["active", "inactive", "blocked", "suspended"].includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: "status must be one of: active, inactive, blocked, suspended",
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user.toJSON(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    
    // Handle MongoDB validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while updating profile",
      error: error.message,
    });
  }
};
