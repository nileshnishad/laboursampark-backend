import User from "../models/User.js";

// ==========================================
// 👥 GET VISIBLE USERS (Discovery API)
// ==========================================

export const getVisibleUsers = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, skills, location, rating, minRate, maxRate } = req.query;

    console.log("Getting visible users for userId:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Get current user to check their userType
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Determine which users to show based on current user's type
    const targetUserType = currentUser.userType === "labour" ? "contractor" : "labour";

    // Build filter: must have display=true and opposite userType
    const filter = {
      userType: targetUserType,
      display: true,
      _id: { $ne: userId }, // Exclude self
    };

    // Optional filters
    if (skills) {
      // Search for users with specific skills
      const skillsArray = skills.split(",").map(s => s.trim());
      filter.skills = { $in: skillsArray };
    }

    if (location) {
      // Search by city
      filter["location.city"] = { $regex: location, $options: "i" };
    }

    if (rating) {
      // Filter by minimum rating
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Filter by rate range
    if (minRate || maxRate) {
      const rateFilter = {};
      if (minRate) rateFilter.$gte = parseFloat(minRate);
      if (maxRate) rateFilter.$lte = parseFloat(maxRate);
      
      // Check hourlyRate or dayRate
      filter.$or = [
        { hourlyRate: rateFilter },
        { dayRate: rateFilter },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get visible users
    const users = await User.find(filter)
      .select("-password -emailVerificationToken -resetPasswordToken") // Exclude sensitive fields
      .sort({ rating: -1, totalReviews: -1 }) // Sort by rating
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    // Format response data
    const formattedUsers = users.map(user => {
      const userData = user.toJSON();
      return {
        _id: userData._id,
        fullName: userData.fullName,
        email: userData.email,
        userType: userData.userType,
        profilePhotoUrl: userData.profilePhotoUrl,
        companyLogoUrl: userData.companyLogoUrl,
        bio: userData.bio,
        about: userData.about,
        skills: userData.skills,
        location: userData.location,
        rating: userData.rating,
        totalReviews: userData.totalReviews,
        completedJobs: userData.completedJobs,
        hourlyRate: userData.hourlyRate,
        dayRate: userData.dayRate,
        projectRate: userData.projectRate,
        experience: userData.experience,
        experienceRange: userData.experienceRange,
        availability: userData.availability,
        serviceCategories: userData.serviceCategories,
        coverageArea: userData.coverageArea,
        certifications: userData.certifications,
        workTypes: userData.workTypes,
        businessName: userData.businessName, // For contractors
        phoneNumber: userData.mobile, // Show mobile for visible users
        preferredContactMethod: userData.preferredContactMethod,
        socialLinks: userData.socialLinks,
      };
    });

    res.status(200).json({
      success: true,
      message: `Visible ${targetUserType}s retrieved successfully`,
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        filters: {
          showingType: targetUserType,
          currentUserType: currentUser.userType,
        },
      },
    });
  } catch (error) {
    console.error("Get visible users error:", error.name, error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving visible users",
      error: error.message,
    });
  }
};

// ==========================================
// 👷 GET ALL LABOUR (Public API)
// ==========================================

export const getLabours = async (req, res) => {
  try {
    const { page = 1, limit = 20, skills, location, rating, minRate, maxRate } = req.query;

    console.log("Fetching labour users...");

    // Build filter: labour users with display=true
    const filter = {
      userType: "labour",
      display: true,
    };

    // Optional filters
    if (skills) {
      const skillsArray = skills.split(",").map(s => s.trim());
      filter.skills = { $in: skillsArray };
    }

    if (location) {
      filter["location.city"] = { $regex: location, $options: "i" };
    }

    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Filter by rate range
    if (minRate || maxRate) {
      const rateFilter = {};
      if (minRate) rateFilter.$gte = parseFloat(minRate);
      if (maxRate) rateFilter.$lte = parseFloat(maxRate);
      
      filter.$or = [
        { hourlyRate: rateFilter },
        { dayRate: rateFilter },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get labour users
    const users = await User.find(filter)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .sort({ rating: -1, totalReviews: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    // Format response data
    const formattedUsers = users.map(user => {
      const userData = user.toJSON();
      return {
        _id: userData._id,
        fullName: userData.fullName,
        email: userData.email,
        userType: userData.userType,
        profilePhotoUrl: userData.profilePhotoUrl,
        bio: userData.bio,
        skills: userData.skills,
        location: userData.location,
        rating: userData.rating,
        totalReviews: userData.totalReviews,
        completedJobs: userData.completedJobs,
        hourlyRate: userData.hourlyRate,
        dayRate: userData.dayRate,
        projectRate: userData.projectRate,
        experience: userData.experience,
        experienceRange: userData.experienceRange,
        availability: userData.availability,
        serviceCategories: userData.serviceCategories,
        workTypes: userData.workTypes,
        coverageArea: userData.coverageArea,
        aadharVerified: userData.aadharVerified,
        certifications: userData.certifications,
        mobile: userData.mobile,
        preferredContactMethod: userData.preferredContactMethod,
        socialLinks: userData.socialLinks,
      };
    });

    res.status(200).json({
      success: true,
      message: "Labour users retrieved successfully",
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get labour error:", error.name, error.message);

    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving labour users",
      error: error.message,
    });
  }
};

// ==========================================
// 🏢 GET ALL CONTRACTORS (Public API)
// ==========================================

export const getContractors = async (req, res) => {
  try {
    const { page = 1, limit = 20, skills, location, rating, minRate, maxRate } = req.query;

    console.log("Fetching contractor users...");

    // Build filter: contractor users with display=true
    const filter = {
      userType: "contractor",
      display: true,
    };

    // Optional filters
    if (skills) {
      const skillsArray = skills.split(",").map(s => s.trim());
      filter.skills = { $in: skillsArray };
    }

    if (location) {
      filter["location.city"] = { $regex: location, $options: "i" };
    }

    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Filter by rate range
    if (minRate || maxRate) {
      const rateFilter = {};
      if (minRate) rateFilter.$gte = parseFloat(minRate);
      if (maxRate) rateFilter.$lte = parseFloat(maxRate);
      
      filter.$or = [
        { hourlyRate: rateFilter },
        { dayRate: rateFilter },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get contractor users
    const users = await User.find(filter)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .sort({ rating: -1, totalReviews: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    // Format response data
    const formattedUsers = users.map(user => {
      const userData = user.toJSON();
      return {
        _id: userData._id,
        fullName: userData.fullName,
        email: userData.email,
        userType: userData.userType,
        profilePhotoUrl: userData.profilePhotoUrl,
        companyLogoUrl: userData.companyLogoUrl,
        bio: userData.bio,
        about: userData.about,
        skills: userData.skills,
        location: userData.location,
        city: userData.location?.city || "",
        state: userData.location?.state || "",
        rating: userData.rating,
        totalReviews: userData.totalReviews,
        completedJobs: userData.completedJobs,
        hourlyRate: userData.hourlyRate,
        dayRate: userData.dayRate,
        projectRate: userData.projectRate,
        experience: userData.experience,
        experienceRange: userData.experienceRange,
        availability: userData.availability,
        serviceCategories: userData.serviceCategories,
        coverageArea: userData.coverageArea,
        certifications: userData.certifications,
        businessName: userData.businessName,
        gstNumber: userData.gstNumber,
        mobile: userData.mobile,
        preferredContactMethod: userData.preferredContactMethod,
        socialLinks: userData.socialLinks,
        insuranceDetails: userData.insuranceDetails,
      };
    });

    res.status(200).json({
      success: true,
      message: "Contractor users retrieved successfully",
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get contractors error:", error.name, error.message);

    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving contractor users",
      error: error.message,
    });
  }
};
