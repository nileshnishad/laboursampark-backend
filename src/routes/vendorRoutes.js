/**
 * Vendor Routes
 * Path: src/routes/vendorRoutes.js
 */
import express from "express";
import vendorAuth from "../middleware/vendorAuth.js";
import * as vendorController from "../controllers/vendorController.js";

const router = express.Router();

// 🔓 Public Vendor Authentication Routes
router.post("/register", vendorController.registerVendor);
router.post("/login", vendorController.loginVendor);

// 🔒 All following vendor routes require a valid JWT session with vendor userType (or admin)
router.use(vendorAuth);

// 🏢 Vendor Profile & KYC
router.get("/profile", vendorController.getProfile);
router.put("/profile", vendorController.updateProfile);

// 📦 Product Catalogue
router.get("/products", vendorController.getProducts);
router.post("/products", vendorController.addProduct);
router.put("/products/:id", vendorController.updateProduct);
router.delete("/products/:id", vendorController.deleteProduct);

// 📋 Material Site Requirements & Quotations
router.get("/requirements", vendorController.getRequirements);
router.post("/requirements/:id/quote", vendorController.submitQuotation);

// 👷 Workforce Hiring
router.get("/workforce", vendorController.getWorkforceRequirements);
router.post("/workforce", vendorController.createWorkforceRequirement);

// 📊 Dashboard KPI Analytics
router.get("/stats", vendorController.getDashboardStats);

export default router;

