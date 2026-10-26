/**
 * Vendor Controller
 * Path: src/controllers/vendorController.js
 */
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import VendorProduct from "../models/VendorProduct.js";
import ProductRequirement from "../models/ProductRequirement.js";
import VendorWorkforce from "../models/VendorWorkforce.js";

// ========================================================
// 🔑 0. VENDOR AUTHENTICATION (REGISTER & LOGIN)
// ========================================================

export const registerVendor = async (req, res) => {
  try {
    const {
      fullName,
      name,
      email,
      mobile,
      phone,
      password,
      companyName,
      businessType,
      gstNumber,
      location,
    } = req.body;

    const userMobile = mobile || phone;
    const userFullName = fullName || name;

    if (!userMobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and password are required for registration",
      });
    }

    let formattedMobile = userMobile;
    if (/^\d{10}$/.test(formattedMobile)) {
      formattedMobile = "+91" + formattedMobile;
    }

    const duplicateConditions = [{ mobile: formattedMobile }];
    if (email) duplicateConditions.push({ email });
    const existingUser = await User.findOne({ $or: duplicateConditions });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email or mobile number already exists",
      });
    }

    const vendor = new User({
      fullName: userFullName || companyName || "Vendor",
      name: userFullName || companyName || "Vendor",
      email,
      mobile: formattedMobile,
      password,
      userType: "vendor",
      companyName: companyName || userFullName,
      businessType: businessType || "Multi-Product Construction Material Depot",
      gstNumber: gstNumber ? gstNumber.toUpperCase() : "",
      location: location || { address: "", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      isVerified: true,
      kycStatus: "pending_review",
    });

    await vendor.save();

    const token = jwt.sign(
      {
        userId: vendor._id,
        email: vendor.email,
        mobile: vendor.mobile,
        userType: vendor.userType,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Vendor registered successfully",
      token,
      data: {
        id: `v-${vendor._id}`,
        userId: vendor._id,
        fullName: vendor.fullName,
        email: vendor.email,
        mobile: vendor.mobile,
        companyName: vendor.companyName,
        businessType: vendor.businessType,
        userType: vendor.userType,
        isVerified: vendor.isVerified,
        kycStatus: vendor.kycStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const loginVendor = async (req, res) => {
  try {
    const { email, mobile, phone, password } = req.body;
    const identifier = mobile || phone || email;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email/mobile and password",
      });
    }

    let formattedMobile = identifier;
    if (/^\d{10}$/.test(formattedMobile)) {
      formattedMobile = "+91" + formattedMobile;
    }

    const query = [
      { email: identifier },
      { mobile: formattedMobile },
      { mobile: identifier },
    ];

    const user = await User.findOne({ $or: query }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or account not found",
      });
    }

    if (
      user.userType !== "vendor" &&
      user.userType !== "admin" &&
      user.userType !== "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access restricted to vendor accounts",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

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

    return res.json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: `v-${user._id}`,
        userId: user._id,
        fullName: user.fullName || user.name,
        email: user.email,
        mobile: user.mobile,
        companyName: user.companyName || user.fullName,
        businessType: user.businessType,
        userType: user.userType,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus || "pending_review",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================
// 🏢 1. VENDOR PROFILE & KYC
// ========================================================

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.vendorId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" });
    }

    return res.json({
      success: true,
      data: {
        id: `v-${user._id}`,
        userId: user._id,
        fullName: user.fullName || user.name || "",
        email: user.email || "",
        mobile: user.mobile || user.phone || "",
        companyName: user.companyName || user.fullName || "",
        businessType: user.businessType || "Multi-Product Construction Material Depot",
        gstNumber: user.gstNumber || "",
        registrationNumber: user.registrationNumber || "",
        location: user.location || { address: "", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
        about: user.about || "",
        isVerified: user.isVerified || false,
        kycStatus: user.kycStatus || "pending_review",
        documents: user.vendorDocuments || {},
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      companyName,
      businessType,
      gstNumber,
      registrationNumber,
      about,
      location,
      documents,
    } = req.body;

    const updates = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (businessType !== undefined) updates.businessType = businessType;
    if (gstNumber !== undefined) updates.gstNumber = gstNumber.toUpperCase();
    if (registrationNumber !== undefined) updates.registrationNumber = registrationNumber;
    if (about !== undefined) updates.about = about;
    if (location !== undefined) updates.location = location;
    if (documents !== undefined) updates.vendorDocuments = documents;

    const updatedUser = await User.findByIdAndUpdate(
      req.vendorId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    return res.json({
      success: true,
      message: "Vendor profile updated successfully",
      data: {
        id: `v-${updatedUser._id}`,
        userId: updatedUser._id,
        fullName: updatedUser.fullName || updatedUser.name || "",
        email: updatedUser.email || "",
        mobile: updatedUser.mobile || updatedUser.phone || "",
        companyName: updatedUser.companyName || updatedUser.fullName || "",
        businessType: updatedUser.businessType || "Multi-Product Construction Material Depot",
        gstNumber: updatedUser.gstNumber || "",
        registrationNumber: updatedUser.registrationNumber || "",
        location: updatedUser.location || { address: "", city: "", state: "", pincode: "" },
        about: updatedUser.about || "",
        isVerified: updatedUser.isVerified || false,
        kycStatus: updatedUser.kycStatus || "pending_review",
        documents: updatedUser.vendorDocuments || {},
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================
// 📦 2. PRODUCT CATALOGUE MANAGEMENT
// ========================================================

export const getProducts = async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const filter = { vendorId: req.vendorId };

    if (category && category !== "all") {
      filter.category = category;
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await VendorProduct.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      sku,
      price,
      unit,
      availableQuantity,
      minOrderQuantity,
      description,
      imageUrl,
      status,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: "Name and price are required" });
    }

    const newProduct = new VendorProduct({
      vendorId: req.vendorId,
      name,
      category,
      sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
      price: Number(price),
      unit: unit || "Piece",
      availableQuantity: Number(availableQuantity) || 0,
      minOrderQuantity: Number(minOrderQuantity) || 1,
      description: description || "",
      imageUrl: imageUrl || null,
      status: status || "active",
    });

    await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Product added to catalogue successfully",
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await VendorProduct.findOne({ _id: id, vendorId: req.vendorId });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
    }

    const allowedFields = [
      "name",
      "category",
      "sku",
      "price",
      "unit",
      "availableQuantity",
      "minOrderQuantity",
      "description",
      "imageUrl",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "price" || field === "availableQuantity" || field === "minOrderQuantity") {
          product[field] = Number(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
      }
    });

    await product.save();

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await VendorProduct.findOneAndDelete({ _id: id, vendorId: req.vendorId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
    }

    return res.json({
      success: true,
      message: "Product removed from catalogue",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================
// 📋 3. MATERIAL SITE REQUIREMENTS & QUOTATIONS
// ========================================================

export const getRequirements = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }
    if (status && status !== "all") {
      filter.status = status;
    }

    const requirements = await ProductRequirement.find(filter).sort({ createdAt: -1 });

    // Format output including this vendor's quote if already submitted
    const formatted = requirements.map((reqDoc) => {
      const obj = reqDoc.toJSON();
      const existingQuote =
        reqDoc.quotations &&
        reqDoc.quotations.find(
          (q) => q.vendorId && q.vendorId.toString() === req.vendorId.toString()
        );

      if (existingQuote) {
        obj.status = "quoted";
        obj.myQuote = {
          offeredPrice: existingQuote.offeredPrice,
          deliveryDays: existingQuote.deliveryDays,
          notes: existingQuote.notes,
          quotedAt: existingQuote.quotedAt,
        };
      }
      return obj;
    });

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { offeredPrice, deliveryDays, notes } = req.body;

    if (!offeredPrice || Number(offeredPrice) <= 0) {
      return res.status(400).json({ success: false, message: "Valid offered price is required" });
    }

    const requirement = await ProductRequirement.findById(id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: "Material requirement not found" });
    }

    // Check if quotation already exists for this vendor
    const existingIndex = requirement.quotations.findIndex(
      (q) => q.vendorId && q.vendorId.toString() === req.vendorId.toString()
    );

    const quoteData = {
      vendorId: req.vendorId,
      offeredPrice: Number(offeredPrice),
      deliveryDays: Number(deliveryDays) || 3,
      notes: notes || "",
      quotedAt: new Date(),
      status: "pending",
    };

    if (existingIndex > -1) {
      requirement.quotations[existingIndex] = quoteData;
    } else {
      requirement.quotations.push(quoteData);
    }

    await requirement.save();

    const result = requirement.toJSON();
    result.status = "quoted";
    result.myQuote = {
      offeredPrice: quoteData.offeredPrice,
      deliveryDays: quoteData.deliveryDays,
      notes: quoteData.notes,
      quotedAt: quoteData.quotedAt,
    };

    return res.json({
      success: true,
      message: "Quotation submitted successfully to buyer",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================
// 👷 4. WORKFORCE HIRING (BULK REQUIREMENTS)
// ========================================================

export const getWorkforceRequirements = async (req, res) => {
  try {
    const requirements = await VendorWorkforce.find({ vendorId: req.vendorId }).sort({
      createdAt: -1,
    });
    return res.json({
      success: true,
      count: requirements.length,
      data: requirements,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createWorkforceRequirement = async (req, res) => {
  try {
    const {
      title,
      workerType,
      tradeCategory,
      workersNeeded,
      skillsRequired,
      workLocation,
      startDate,
      duration,
      budgetPerWorker,
      budgetPeriod,
      description,
    } = req.body;

    if (!title || !workersNeeded || !tradeCategory) {
      return res.status(400).json({
        success: false,
        message: "Title, workers needed, and trade category are required",
      });
    }

    const newReq = new VendorWorkforce({
      vendorId: req.vendorId,
      title,
      workerType: workerType || "labour",
      tradeCategory,
      workersNeeded: Number(workersNeeded),
      skillsRequired: skillsRequired || [],
      workLocation: workLocation || { city: "Mumbai", state: "Maharashtra", address: "" },
      startDate: startDate || new Date().toISOString().split("T")[0],
      duration: duration || "15 Days",
      budgetPerWorker: Number(budgetPerWorker) || 0,
      budgetPeriod: budgetPeriod || "daily",
      description: description || "",
      status: "open",
      applicantCount: 0,
    });

    await newReq.save();

    return res.status(201).json({
      success: true,
      message: "Workforce bulk requirement posted successfully",
      data: newReq,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================
// 📊 5. DASHBOARD SUMMARY STATS
// ========================================================

export const getDashboardStats = async (req, res) => {
  try {
    const vendorId = req.vendorId;

    const [
      totalProducts,
      activeProducts,
      outOfStockCount,
      totalRequirements,
      openRequirements,
      quotedRequirements,
      workforceRequests,
    ] = await Promise.all([
      VendorProduct.countDocuments({ vendorId }),
      VendorProduct.countDocuments({ vendorId, status: "active" }),
      VendorProduct.countDocuments({
        vendorId,
        $or: [{ availableQuantity: 0 }, { status: "out_of_stock" }],
      }),
      ProductRequirement.countDocuments(),
      ProductRequirement.countDocuments({ status: "open" }),
      ProductRequirement.countDocuments({ "quotations.vendorId": vendorId }),
      VendorWorkforce.find({ vendorId, status: "open" }),
    ]);

    const activeWorkforceRequests = workforceRequests.length;
    const totalWorkersNeeded = workforceRequests.reduce(
      (acc, curr) => acc + (curr.workersNeeded || 0),
      0
    );

    return res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        outOfStockCount,
        totalRequirements,
        openRequirements,
        quotedRequirements,
        activeWorkforceRequests,
        totalWorkersNeeded,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  registerVendor,
  loginVendor,
  getProfile,
  updateProfile,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getRequirements,
  submitQuotation,
  getWorkforceRequirements,
  createWorkforceRequirement,
  getDashboardStats,
};

