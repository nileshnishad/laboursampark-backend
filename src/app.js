// ==========================================
// 🚀 EXPRESS APPLICATION SETUP
// ==========================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// ==========================================
// 🛣️ ROUTE IMPORTS
// ==========================================

import userRoutes from "./routes/userRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

// ==========================================
// 🔐 ENVIRONMENT CONFIGURATION
// ==========================================

dotenv.config();

// ==========================================
// 🏗️ EXPRESS APP INITIALIZATION
// ==========================================

const app = express();

// ==========================================
// 🌐 CORS CONFIGURATION
// ==========================================

app.use(cors({ origin: "*" }));

// ==========================================
// 🛡️ SECURITY & PARSING MIDDLEWARE
// ==========================================

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ==========================================
// 📁 HEALTH CHECK & BASIC ROUTES
// ==========================================

app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "LabourSampark API Running 🚀",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 🛣️ API ROUTES CONFIGURATION
// ==========================================

// Authentication & User Routes
app.use("/api/users", userRoutes);
app.use("/auth", userRoutes);

// Document Routes
app.use("/api/documents", documentRoutes);

// ==========================================
// ❌ ERROR HANDLING MIDDLEWARE
// ==========================================

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An error occurred",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

// ==========================================
// 🚀 EXPORT FOR DEPLOYMENT
// ==========================================

export default app;
