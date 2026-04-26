import { subscriptionPlans } from "../utils/subscriptionPlans.js";

export const getSubscriptionPlan = async (req, res) => {
  try {
    const { userType } = req.query;
    if (!userType) {
      return res.status(400).json({ success: false, message: "userType is required" });
    }
    const plan = subscriptionPlans[userType.toLowerCase()];
    if (!plan) {
      return res.status(404).json({ success: false, message: "No plan found for this userType" });
    }
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get subscription plan", error: error.message });
  }
};
