// subscriptionPlans.js

export const subscriptionPlans = {
  labour: {
    userType: "labour",
    price: 99,
    durationDays: 90,
    pricePerDay: 1.10,
    features: [
      "Basic Job Access",
      "Limited Contractor Connections",
      "Profile Listing",
      "Support Access"
    ],
    total: 99,
    currency: "INR"
  },
  sub_contractor: {
    userType: "sub_contractor",
    price: 199,
    durationDays: 90,
    pricePerDay: 2.21,
    features: [
      "Post Small Projects",
      "Connect with Labour",
      "Basic Analytics",
      "Priority Listing"
    ],
    total: 199,
    currency: "INR"
  },
  contractor: {
    userType: "contractor",
    price: 299,
    durationDays: 90,
    pricePerDay: 3.32,
    features: [
      "Unlimited Project Posting",
      "Direct Labour Hiring",
      "Advanced Analytics",
      "Priority Support",
      "Verified Badge"
    ],
    total: 299,
    currency: "INR"
  }
};
