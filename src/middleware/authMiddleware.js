import jwt from "jsonwebtoken";

// ==========================================
// 🔐 AUTHENTICATION MIDDLEWARE
// ==========================================

export const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token is required. Please login first.",
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format. Use: Authorization: Bearer <token>",
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Validate decoded token has required fields
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: missing userId",
      });
    }

    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email || null,
      mobile: decoded.mobile || null,
      userType: decoded.userType || null,
    };

    req.userId = decoded.userId; // Easy access to userId

    next();
  } catch (error) {
    console.error("Authentication error:", error.name, error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

// ==========================================
// ✅ OPTIONAL AUTHENTICATION MIDDLEWARE
// ==========================================

export const optionalAuthenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );

        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          mobile: decoded.mobile,
          userType: decoded.userType,
        };

        req.userId = decoded.userId;
      } catch (error) {
        console.warn("Token verification failed, continuing as guest:", error.message);
        // Don't fail, just continue without user info
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth error:", error.message);
    // Don't fail, just continue without user info
    next();
  }
};

// ==========================================
// 🟢 PUBLIC ENDPOINT (No Token Required)
// ==========================================

export const publicEndpoint = (req, res, next) => {
  // No token validation - completely public
  // Optionally attach user if token is provided
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        mobile: decoded.mobile,
        userType: decoded.userType,
      };

      req.userId = decoded.userId;
    }
  } catch (error) {
    // Silently ignore token errors for public endpoints
  }

  next();
};

// ==========================================
// 🔒 AUTHORIZATION MIDDLEWARE (Check User Type)
// ==========================================

export const authorizeUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required userType: ${allowedTypes.join(", ")}`,
      });
    }

    next();
  };
};

// ==========================================
// 👮 ADMIN ONLY MIDDLEWARE
// ==========================================

export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // You can add admin check logic here
  // For now, assuming certain userTypes are admins
  const adminTypes = ["admin", "superadmin"];

  if (!adminTypes.includes(req.user.userType)) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};
