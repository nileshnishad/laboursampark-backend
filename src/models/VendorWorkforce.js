/**
 * Vendor Workforce Hiring / Bulk Labour Request Model
 * Path: src/models/VendorWorkforce.js
 */
import mongoose from "mongoose";
import { WORKER_TYPES, WORKFORCE_TRADE_CATEGORIES } from "../constants/vendorConstants.js";

const vendorWorkforceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Workforce title is required"],
      trim: true,
    },
    workerType: {
      type: String,
      required: true,
      enum: WORKER_TYPES, // 'labour', 'contractor', 'sub_contractor'
      index: true,
    },
    tradeCategory: {
      type: String,
      required: true,
      enum: WORKFORCE_TRADE_CATEGORIES,
      index: true,
    },
    workersNeeded: {
      type: Number,
      required: true,
      min: [1, "At least 1 worker needed"],
    },
    skillsRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    workLocation: {
      address: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
    },
    startDate: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: "15 Days",
    },
    budgetPerWorker: {
      type: Number,
      required: true,
      min: [0, "Budget must be non-negative"],
    },
    budgetPeriod: {
      type: String,
      enum: ["daily", "monthly", "project_fixed"],
      default: "daily",
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "in_review", "fulfilled", "closed"],
      default: "open",
      index: true,
    },
    applicantCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

vendorWorkforceSchema.index({ vendorId: 1, status: 1 });

const VendorWorkforce =
  mongoose.models.VendorWorkforce || mongoose.model("VendorWorkforce", vendorWorkforceSchema);

export default VendorWorkforce;

