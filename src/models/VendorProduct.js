/**
 * Vendor Product Catalogue Model
 * Path: src/models/VendorProduct.js
 */
import mongoose from "mongoose";
import { VENDOR_PRODUCT_CATEGORIES, PRODUCT_UNITS } from "../constants/vendorConstants.js";

const vendorProductSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: VENDOR_PRODUCT_CATEGORIES,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: function () {
        return `SKU-${Date.now().toString().slice(-6)}`;
      },
    },
    price: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Price must be non-negative"],
    },
    unit: {
      type: String,
      required: true,
      default: "Piece",
      enum: PRODUCT_UNITS,
    },
    availableQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    minOrderQuantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Minimum order quantity must be at least 1"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock"],
      default: "active",
      index: true,
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

// Compound index for quick catalog searches
vendorProductSchema.index({ vendorId: 1, category: 1, status: 1 });
vendorProductSchema.index({ name: "text", description: "text", sku: "text" });

const VendorProduct = mongoose.models.VendorProduct || mongoose.model("VendorProduct", vendorProductSchema);

export default VendorProduct;

