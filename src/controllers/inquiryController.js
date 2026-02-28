import Inquiry from "../models/Inquiry.js";

// ==========================================
// 📝 SUBMIT NEW INQUIRY
// ==========================================

export const submitInquiry = async (req, res) => {
  try {
    const { fullName, email, mobile, subject, message, inquiryType, userType } = req.body;

    // Validation
    if (!fullName || !email || !mobile || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: fullName, email, mobile, subject, message",
      });
    }

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Mobile validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit mobile number",
      });
    }

    // Message length validation
    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 10 characters long",
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 5000 characters",
      });
    }

    // Create new inquiry
    const inquiryData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      subject: subject.trim(),
      message: message.trim(),
      inquiryType: inquiryType || "general",
      userType: userType || "guest",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      userId: req.user?._id || null,
    };

    const inquiry = new Inquiry(inquiryData);
    await inquiry.save();

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: {
        inquiryId: inquiry._id,
        fullName: inquiry.fullName,
        email: inquiry.email,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      },
    });
  } catch (error) {
    console.error("Submit inquiry error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while submitting inquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 📋 GET ALL INQUIRIES (Admin)
// ==========================================

export const getAllInquiries = async (req, res) => {
  try {
    const { status, priority, inquiryType, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (inquiryType) filter.inquiryType = inquiryType;

    const skip = (page - 1) * limit;

    const inquiries = await Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-userAgent -ipAddress");

    const total = await Inquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Inquiries retrieved successfully",
      data: {
        inquiries,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get inquiries error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving inquiries",
      error: error.message,
    });
  }
};

// ==========================================
// 🔍 GET INQUIRY BY ID
// ==========================================

export const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id)
      .populate("userId", "fullName email mobile userType")
      .populate("assignedTo", "fullName email")
      .populate("response.respondedBy", "fullName email");

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Inquiry retrieved successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Get inquiry by ID error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving inquiry",
      error: error.message,
    });
  }
};

// ==========================================
// ✏️ UPDATE INQUIRY STATUS/RESPONSE
// ==========================================

export const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, response, adminNotes, assignedTo } = req.body;

    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    // Update fields
    if (status) inquiry.status = status;
    if (priority) inquiry.priority = priority;
    if (adminNotes) inquiry.adminNotes = adminNotes;
    if (assignedTo) inquiry.assignedTo = assignedTo;

    // Add response if provided
    if (response) {
      inquiry.response = {
        respondedAt: new Date(),
        respondedBy: req.user?._id,
        responseMessage: response,
      };
      inquiry.status = "resolved";
    }

    await inquiry.save();

    res.status(200).json({
      success: true,
      message: "Inquiry updated successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Update inquiry error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating inquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 🗑️ DELETE INQUIRY
// ==========================================

export const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
      data: { inquiryId: id },
    });
  } catch (error) {
    console.error("Delete inquiry error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting inquiry",
      error: error.message,
    });
  }
};

// ==========================================
// 📊 GET INQUIRY STATISTICS
// ==========================================

export const getInquiryStats = async (req, res) => {
  try {
    const stats = await Inquiry.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = await Inquiry.aggregate([
      {
        $group: {
          _id: "$inquiryType",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Inquiry.countDocuments();

    res.status(200).json({
      success: true,
      message: "Inquiry statistics retrieved successfully",
      data: {
        total,
        byStatus: stats,
        byType: typeStats,
      },
    });
  } catch (error) {
    console.error("Get inquiry stats error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving statistics",
      error: error.message,
    });
  }
};
