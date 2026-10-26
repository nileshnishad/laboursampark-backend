/**
 * Vendor Authentication & Authorization Middleware
 * Path: src/middleware/vendorAuth.js
 */
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const vendorAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    const userId = decoded.id || decoded.userId || decoded._id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found or expired.",
      });
    }

    // Permit vendor role or system administrators
    if (
      user.userType !== "vendor" &&
      user.userType !== "admin" &&
      user.userType !== "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access restricted to authorized Vendor accounts only.",
      });
    }

    req.user = user;
    req.vendorId = user._id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session token.",
      error: error.message,
    });
  }
};

export default vendorAuth;

