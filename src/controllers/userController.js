import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import { forgotPasswordTemplate } from "../utils/templates/forgotPasswordTemplate.js";
import { sendTwilioSms } from "../utils/twilio/verifyService.js";
import {
  labourWelcomeSms,
  contractorWelcomeSms,
  subContractorWelcomeSms,
  labourRatingReceivedSms,
  contractorRatingReceivedSms,
  subContractorRatingReceivedSms
} from "../utils/twilio/templates/smsTemplates.js";

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
    const validUserTypes = ["labour", "contractor", "sub_contractor", "admin", "super_admin"];
    if (!validUserTypes.includes(userType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "userType must be either 'labour', 'contractor', 'sub_contractor', 'admin' or 'super_admin'",
      });
    }


    // Always store mobile number with +91 prefix if 10 digits
    let formattedMobile = mobile;
    if (/^\d{10}$/.test(formattedMobile)) {
      formattedMobile = "+91" + formattedMobile;
    }

    // Create new user with all fields from payload, but formatted mobile
    const userData = {
      ...req.body,
      mobile: formattedMobile,
      userType: userType.toLowerCase(),
    };

    // Sanitize location coordinates if present
    if (userData.location && userData.location.coordinates) {
      if (!userData.location.coordinates.type || userData.location.coordinates.type === "") {
        userData.location.coordinates.type = "Point";
      }
      if (!Array.isArray(userData.location.coordinates.coordinates)) {
        userData.location.coordinates.coordinates = [0, 0];
      }
    }

    const user = new User(userData);

    // Auto-generate userCode: LS<YY><6-digit serial> e.g. LS26000001
    // Find the last userCode for this year and increment
    const yy = String(new Date().getFullYear()).slice(-2);
    const prefix = `LS${yy}`;
    const lastUser = await User.findOne(
      { userCode: { $regex: `^${prefix}` } },
      { userCode: 1 },
    ).sort({ userCode: -1 }).lean();

    let serial = 1;
    if (lastUser?.userCode) {
      const lastSerial = parseInt(lastUser.userCode.slice(prefix.length), 10);
      if (!isNaN(lastSerial)) serial = lastSerial + 1;
    }
    user.userCode = `${prefix}${String(serial).padStart(6, "0")}`;

    // Save user (password will be hashed by pre-save hook)
    await user.save();


    // formattedMobile is already set above for userData, so just use it below

    // Send welcome SMS based on userType
    let smsBody;
    if (user.userType === "labour") {
      smsBody = labourWelcomeSms(user.fullName);
    } else if (user.userType === "contractor") {
      smsBody = contractorWelcomeSms(user.fullName);
    } else if (user.userType === "sub_contractor") {
      smsBody = subContractorWelcomeSms(user.fullName);
    }
    if (smsBody) {
      try {
        await sendTwilioSms({
          to: formattedMobile,
          body: smsBody,
          messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
        });
      } catch (smsError) {
        console.error("Failed to send welcome SMS:", smsError);
      }
    }

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
      OTPstatus: userData.OTPstatus,
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

    console.log("Getting profile for userId:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate MongoDB ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get clean user data without sensitive fields
    const userData = user.toJSON();

    // Return all profile data
    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: userData,
    });
  } catch (error) {
    console.error("Get profile error:", error.name, error.message);

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

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

    console.log("Updating profile for userId:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validate MongoDB ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const updateData = { ...req.body }; // Create copy to avoid mutating req.body

    // Fields that cannot be updated
    const restrictedFields = ["_id", "password", "email", "mobile", "createdAt", "resetPasswordToken", "resetPasswordExpire", "emailVerificationToken", "emailVerificationExpire"];

    // Remove restricted fields
    restrictedFields.forEach(field => {
      delete updateData[field];
    });

    // Quick validation for critical fields
    if (updateData.userType && !["labour", "contractor"].includes(updateData.userType)) {
      return res.status(400).json({
        success: false,
        message: "userType must be either 'labour' or 'contractor'",
      });
    }

    if (updateData.status && !["active", "inactive", "blocked", "suspended"].includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: "status must be one of: active, inactive, blocked, suspended",
      });
    }

    if (updateData.age && (typeof updateData.age !== "number" || updateData.age < 0)) {
      return res.status(400).json({
        success: false,
        message: "Age must be a positive number",
      });
    }

    // Update user in database
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
    console.error("Update profile error:", error.name, error.message);

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

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

// ==========================================
// ⚙️ CONFIG CHECK (SAVE/UPDATE FCM TOKEN)
// ==========================================

export const configCheck = async (req, res) => {
  try {
    const userId = req.userId;
    const { fcmToken } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Valid fcmToken is required",
      });
    }

    const sanitizedToken = fcmToken.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: { deviceTokens: [sanitizedToken] },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Config check successful and FCM token updated",
      data: {
        tokenSaved: true,
        tokenReplaced: true,
        totalDeviceTokens: Array.isArray(user.deviceTokens) ? user.deviceTokens.length : 0,
      },
    });
  } catch (error) {
    console.error("Config check error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving FCM token",
      error: error.message,
    });
  }
};

// ==========================================
// 🔐 FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validation
    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please provide either email or mobile number",
      });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [
        email && { email },
        mobile && { mobile },
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set reset token and expiry (valid for 1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    // Generate reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Prepare email content
    const emailHtml = forgotPasswordTemplate(user.fullName || "User", resetUrl);

    // Send password reset email
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Password Reset Request - Labour Sampark",
      html: emailHtml,
      text: `Click here to reset your password: ${resetUrl}`,
    });

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email. Please try again later.",
        error: emailResult.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email",
      data: {
        message: "Please check your email for the password reset link",
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during password reset request",
      error: error.message,
    });
  }
};

// ==========================================
// 🔐 RESET PASSWORD (using token from forgot password)
// ==========================================

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    // Validation
    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide reset token, new password and confirm password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash the reset token to find user
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login with your new password",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during password reset",
      error: error.message,
    });
  }
};

// ==========================================
// 🔐 CHANGE PASSWORD (for authenticated users)
// ==========================================

export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation for authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Validation for required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current password, new password and confirm password",
      });
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as current password",
      });
    }

    // Find user and select password field
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordCorrect = await user.matchPassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while changing password",
      error: error.message,
    });
  }
};

// ==========================================
// 📧 SEND OTP (Generic OTP for any verification)
// ==========================================

export const sendOTP = async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validation - either email or mobile required
    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please provide either email or mobile number",
      });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [
        email && { email },
        mobile && { mobile },
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with provided email or mobile",
      });
    }

    // Generate 6-digit OTP (mix of uppercase letters and numbers)
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let otp = "";
    for (let i = 0; i < 6; i++) {
      otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Save OTP in database with 10 minutes expiry
    user.verificationOTP = otp;
    user.verificationOTPExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; border: 2px solid #667eea; }
          .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace; }
          .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verification OTP</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${user.fullName || "User"}</strong>,</p>
            <p>You requested a verification OTP for your Labour Sampark account. Use the code below to complete your verification:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Your Verification Code</p>
              <p class="otp-code">${otp}</p>
              <p style="margin: 0; color: #888; font-size: 12px;">Valid for 10 minutes</p>
            </div>

            <div class="warning">
              <strong>⚠️ Security Note:</strong> Never share this OTP with anyone. Labour Sampark staff will never ask for your OTP.
            </div>

            <p>If you didn't request this OTP, please ignore this email or contact our support team.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>Labour Sampark Team</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Labour Sampark. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send OTP via email
    const emailResult = await sendEmail({
      to: user.email,
      subject: `Your Verification OTP: ${otp} - Labour Sampark`,
      html: emailHtml,
      text: `Your verification OTP is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`,
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again later.",
        error: emailResult.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email successfully",
      data: {
        message: "Please check your email for the 6-digit verification code",
        expiresIn: "10 minutes",
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while sending OTP",
      error: error.message,
    });
  }
};

// ==========================================
// ✅ VERIFY OTP (Verify OTP from database)
// ==========================================

export const verifyOTP = async (req, res) => {
  try {
    const { email, mobile, otp } = req.body;

    // Validation
    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please provide either email or mobile number",
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide OTP code",
      });
    }

    // Validate OTP format (should be 6 characters)
    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 characters long",
      });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [
        email && { email },
        mobile && { mobile },
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with provided email or mobile",
      });
    }

    // Check if OTP exists
    if (!user.verificationOTP) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP first",
      });
    }

    // Check if OTP has expired
    if (user.verificationOTPExpire && new Date() > user.verificationOTPExpire) {
      // Clear expired OTP
      user.verificationOTP = undefined;
      user.verificationOTPExpire = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP",
      });
    }

    // Verify OTP (case-insensitive comparison)
    if (user.verificationOTP.toUpperCase() !== otp.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again",
      });
    }

    // OTP verified successfully - clear it from database
    user.verificationOTP = undefined;
    user.verificationOTPExpire = undefined;
    user.OTPstatus = "active"; // Mark OTP as verified
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        userId: user._id,
        email: user.email,
        mobile: user.mobile,
        verified: true,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while verifying OTP",
      error: error.message,
    });
  }
};

// ==========================================
// 🔐 RESET PASSWORD WITH OTP (After OTP Verification)
// ==========================================

export const resetPasswordWithOTP = async (req, res) => {
  try {
    const { userId, newPassword, confirmPassword } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId",
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide newPassword and confirmPassword",
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Validate MongoDB ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
      });
    }

    // Find user by userId
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP was verified (OTPstatus should be "active")
    if (user.OTPstatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "OTP verification required. Please verify OTP first before changing password",
      });
    }

    // Update password
    user.password = newPassword;
    user.OTPstatus = "inactive"; // Reset OTP status after password change
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login with your new password",
      data: {
        userId: user._id,
        email: user.email,
        message: "You can now login with your new password",
      },
    });
  } catch (error) {
    console.error("Reset password with OTP error:", error);

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while resetting password",
      error: error.message,
    });
  }
};
