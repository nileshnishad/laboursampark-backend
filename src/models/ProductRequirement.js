/**
 * Buyer / Site Material Requirements Model
 * Path: src/models/ProductRequirement.js
 */
import mongoose from "mongoose";
import { VENDOR_PRODUCT_CATEGORIES, PRODUCT_UNITS, REQUIREMENT_STATUSES } from "../constants/vendorConstants.js";

const quotationItemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    offeredPrice: {
      type: Number,
      required: true,
    },
    deliveryDays: {
      type: Number,
      required: true,
      default: 3,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    quotedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const productRequirementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: VENDOR_PRODUCT_CATEGORIES,
      index: true,
    },
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },
    buyerCompany: {
      type: String,
      required: true,
      trim: true,
    },
    buyerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    buyerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    requiredQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      required: true,
      enum: PRODUCT_UNITS,
    },
    targetPrice: {
      type: Number,
      default: null,
    },
    deliveryLocation: {
      address: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, default: "" },
    },
    deliveryTimeline: {
      type: String,
      default: "Within 7 Days",
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: REQUIREMENT_STATUSES,
      default: "open",
      index: true,
    },
    quotations: [quotationItemSchema],
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

productRequirementSchema.index({ status: 1, category: 1, createdAt: -1 });

const ProductRequirement =
  mongoose.models.ProductRequirement || mongoose.model("ProductRequirement", productRequirementSchema);

export default ProductRequirement;

