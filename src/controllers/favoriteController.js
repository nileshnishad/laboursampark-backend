import mongoose from "mongoose";
import User from "../models/User.js";

const FAVORITABLE_USER_TYPES = ["labour", "contractor"];

const WORKER_FIELDS =
  "fullName name mobile email userType profilePhotoUrl skills workTypes experience rating totalReviews completedJobs location availability companyName display status isVerified";

const requireCustomer = (req, res) => {
  if (req.user?.userType !== "user") {
    res.status(403).json({
      success: false,
      message: "Access denied. Only customers (userType: user) can manage favourites.",
    });
    return false;
  }
  return true;
};

const parseWorkerId = (req, res) => {
  const workerId = String(req.body?.workerId || req.params?.workerId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(workerId)) {
    res.status(400).json({ success: false, message: "A valid workerId is required" });
    return null;
  }
  return workerId;
};

// POST /api/users/favorites  { workerId }
export const addFavoriteWorker = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const workerId = parseWorkerId(req, res);
    if (!workerId) return;

    const worker = await User.findById(workerId).select("userType").lean();
    if (!worker || !FAVORITABLE_USER_TYPES.includes(worker.userType)) {
      return res.status(404).json({ success: false, message: "Labour or contractor not found" });
    }

    // $addToSet keeps the array free of duplicates, so repeated calls are safe
    const customer = await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { favoriteWorkers: workerId } },
      { new: true, select: "favoriteWorkers" },
    ).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Added to favourites",
      totalFavorites: customer.favoriteWorkers.length,
    });
  } catch (error) {
    console.error("Error adding favourite worker:", error);
    return res.status(500).json({ success: false, message: "Failed to add favourite" });
  }
};

// DELETE /api/users/favorites/:workerId
export const removeFavoriteWorker = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const workerId = parseWorkerId(req, res);
    if (!workerId) return;

    const customer = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { favoriteWorkers: workerId } },
      { new: true, select: "favoriteWorkers" },
    ).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Removed from favourites",
      totalFavorites: customer.favoriteWorkers.length,
    });
  } catch (error) {
    console.error("Error removing favourite worker:", error);
    return res.status(500).json({ success: false, message: "Failed to remove favourite" });
  }
};

// GET /api/users/favorites?page=1&limit=20
export const getFavoriteWorkers = async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const customer = await User.findById(req.userId).select("favoriteWorkers").lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const ids = customer.favoriteWorkers || [];
    const total = ids.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    // Most recently added first
    const pageIds = [...ids].reverse().slice((page - 1) * limit, page * limit);

    const workers = await User.find({ _id: { $in: pageIds } }).select(WORKER_FIELDS).lean();
    const byId = new Map(workers.map((worker) => [String(worker._id), worker]));
    const favorites = pageIds.map((id) => byId.get(String(id))).filter(Boolean);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      favorites,
    });
  } catch (error) {
    console.error("Error fetching favourite workers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch favourites" });
  }
};
