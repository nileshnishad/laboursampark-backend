import express from "express";
import { getSubscriptionPlan } from "../controllers/subscriptionController.js";

const router = express.Router();

// GET /api/subscription/plan?userType=labour
router.get("/plan", getSubscriptionPlan);

export default router;
