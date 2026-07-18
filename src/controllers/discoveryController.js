import mongoose from "mongoose";
import User from "../models/User.js";
import Skills from "../models/Skills.js";

const parseListParam = (value) => {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(",");
  return values.map((item) => String(item).trim()).filter(Boolean);
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractExperienceYears = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).trim();
  if (!text) return null;

  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[-to+–]\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    return Number.parseFloat(rangeMatch[1]);
  }

  const numericMatch = text.match(/\d+(?:\.\d+)?/);
  if (numericMatch) {
    return Number.parseFloat(numericMatch[0]);
  }

  return null;
};

const buildSkillTerms = async (skillIds) => {
  const skillTerms = parseListParam(skillIds);

  if (skillTerms.length === 0) {
    return [];
  }

  const objectIds = skillTerms.filter((term) => mongoose.Types.ObjectId.isValid(term));
  const rawTerms = skillTerms.filter((term) => !mongoose.Types.ObjectId.isValid(term));

  let resolvedTerms = [];
  if (objectIds.length > 0) {
    const matchedSkills = await Skills.find({ _id: { $in: objectIds } })
      .select("enName name hiName mrName")
      .lean();

    resolvedTerms = matchedSkills.flatMap((skill) => [skill.enName, skill.name, skill.hiName, skill.mrName]);
  }

  return [...new Set([...rawTerms, ...resolvedTerms].map((term) => String(term).trim()).filter(Boolean))];
};

const buildLabourResponse = (userData) => {
  const experienceYears = extractExperienceYears(userData.experienceRange ?? userData.experience);

  return {
    _id: userData._id,
    fullName: userData.fullName,
    email: userData.email,
    userType: userData.userType,
    profilePhotoUrl: userData.profilePhotoUrl,
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
    minimumJobValue: userData.minimumJobValue,
    experience: userData.experience,
    experienceRange: userData.experienceRange,
    experienceYears,
    availability: userData.availability,
    serviceCategories: userData.serviceCategories,
    workTypes: userData.workTypes,
    coverageArea: userData.coverageArea,
    aadharVerified: userData.aadharVerified,
    certifications: userData.certifications,
    mobile: userData.mobile,
    preferredContactMethod: userData.preferredContactMethod,
    socialLinks: userData.socialLinks,
    companyLogoUrl: userData.companyLogoUrl,
    businessName: userData.businessName,
  };
};

// ==========================================
// 👥 GET VISIBLE USERS (Discovery API)
// ==========================================

export const getVisibleUsers = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, skills, location, rating, minRate, maxRate } = req.query;
    const now = new Date();

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
      $or: [{ displayExpiresAt: { $exists: false } }, { displayExpiresAt: null }, { displayExpiresAt: { $gte: now } }],
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
    const {
      page = 1,
      limit = 20,
      search,
      skills,
      skillIds,
      state,
      city,
      area,
      location,
      rating,
      minRating,
      minExperience,
      minRate,
      maxRate,
    } = req.query;
    const now = new Date();
    const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;
    const minimumRating = minRating ?? rating;
    const minimumExperience = minExperience !== undefined && minExperience !== null && String(minExperience).trim() !== ""
      ? Number.parseFloat(minExperience)
      : null;
    const requestedSkills = [...parseListParam(skills), ...(await buildSkillTerms(skillIds))];

    console.log("Fetching labour users...");

    const filter = {
      userType: "labour",
      display: true,
      $and: [
        {
          $or: [
            { displayExpiresAt: { $exists: false } },
            { displayExpiresAt: null },
            { displayExpiresAt: { $gte: now } },
          ],
        },
      ],
    };

    if (requestedSkills.length > 0) {
      filter.skills = { $in: requestedSkills };
    }

    if (search) {
      const searchPattern = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$and.push({
        $or: [
          { fullName: searchPattern },
          { bio: searchPattern },
          { about: searchPattern },
          { experience: searchPattern },
          { experienceRange: searchPattern },
          { skills: searchPattern },
          { "location.city": searchPattern },
          { "location.state": searchPattern },
          { "location.area": searchPattern },
          { coverageArea: searchPattern },
          { workTypes: searchPattern },
          { businessName: searchPattern },
        ],
      });
    }

    if (state) {
      filter["location.state"] = { $regex: escapeRegex(String(state).trim()), $options: "i" };
    }

    if (city) {
      filter["location.city"] = { $regex: escapeRegex(String(city).trim()), $options: "i" };
    }

    if (area) {
      filter["location.area"] = { $regex: escapeRegex(String(area).trim()), $options: "i" };
    }

    if (location && !city) {
      filter["location.city"] = { $regex: escapeRegex(String(location).trim()), $options: "i" };
    }

    if (minimumRating !== undefined && minimumRating !== null && String(minimumRating).trim() !== "") {
      filter.rating = { $gte: Number.parseFloat(minimumRating) };
    }

    if (minRate || maxRate) {
      const rateFilter = {};
      if (minRate) rateFilter.$gte = Number.parseFloat(minRate);
      if (maxRate) rateFilter.$lte = Number.parseFloat(maxRate);

      filter.$and.push({
        $or: [
          { hourlyRate: rateFilter },
          { dayRate: rateFilter },
          { projectRate: rateFilter },
        ],
      });
    }

    const baseQuery = User.find(filter)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .sort({ rating: -1, totalReviews: -1, completedJobs: -1, fullName: 1 });

    let users = await baseQuery.lean();

    if (minimumExperience !== null && !Number.isNaN(minimumExperience)) {
      users = users.filter((user) => {
        const years = extractExperienceYears(user.experienceRange ?? user.experience);
        return years !== null && years >= minimumExperience;
      });
    }

    const total = users.length;
    const paginatedUsers = users.slice(skip, skip + parsedLimit);
    const formattedUsers = paginatedUsers.map(buildLabourResponse);

    res.status(200).json({
      success: true,
      message: "Labour users retrieved successfully",
      data: {
        users: formattedUsers,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
        filters: {
          search: search || null,
          skills: requestedSkills,
          state: state || null,
          city: city || location || null,
          area: area || null,
          minRating: minimumRating !== undefined && minimumRating !== null ? Number.parseFloat(minimumRating) : null,
          minExperience: minimumExperience,
          minRate: minRate || null,
          maxRate: maxRate || null,
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
    const now = new Date();

    console.log("Fetching contractor users...");

    // Build filter: contractor users with display=true
    const filter = {
      userType: ["contractor","sub_contractor"], // Show both contractors and sub-contractors
      display: true,
      $or: [{ displayExpiresAt: { $exists: false } }, { displayExpiresAt: null }, { displayExpiresAt: { $gte: now } }],
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
        businessTypes: userData.businessTypes,
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
