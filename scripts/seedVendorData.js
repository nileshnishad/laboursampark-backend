/**
 * Vendor Seed Script
 * Run: node scripts/seedVendorData.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import VendorProduct from "../src/models/VendorProduct.js";
import ProductRequirement from "../src/models/ProductRequirement.js";
import VendorWorkforce from "../src/models/VendorWorkforce.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/laboursampark";

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // 1. Find or create default demo vendor
  let demoVendor = await User.findOne({ userType: "vendor" });
  if (!demoVendor) {
    demoVendor = new User({
      phone: "+919876543210",
      mobile: "+919876543210",
      email: "vendor@laboursampark.com",
      fullName: "Ramesh Patel",
      name: "Ramesh Patel",
      companyName: "Tech Innovations Material Depot",
      businessType: "Multi-Product Construction Material Depot",
      userType: "vendor",
      password: "Vendor@123", // Pre-save hook hashes this password automatically
      isVerified: true,
      kycStatus: "verified",
      location: {
        address: "Shop 12, APMC Market Yard",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
    });
    await demoVendor.save();
    console.log("Created demo vendor:", demoVendor.email);
  } else {
    console.log("Using existing vendor:", demoVendor.email || demoVendor.mobile);
  }

  // 2. Seed Vendor Products
  await VendorProduct.deleteMany({ vendorId: demoVendor._id });
  await VendorProduct.insertMany([
    {
      vendorId: demoVendor._id,
      name: "UltraTech Super Cement (50kg Bag)",
      category: "Cement & Sand",
      sku: "UT-CEMENT-50",
      price: 385,
      unit: "Bag",
      availableQuantity: 1200,
      minOrderQuantity: 50,
      description: "PPC Grade 53 cement suitable for civil slabs, columns, and foundations.",
      status: "active",
    },
    {
      vendorId: demoVendor._id,
      name: "Tata Tiscon 550D TMT Rebar (12mm)",
      category: "Steel & Rebar",
      sku: "TT-TMT-12MM",
      price: 68500,
      unit: "Ton",
      availableQuantity: 35,
      minOrderQuantity: 2,
      description: "Fe 550D grade high ductile earthquake resistant thermo-mechanically treated rebars.",
      status: "active",
    },
    {
      vendorId: demoVendor._id,
      name: "Standard Red Clay Kiln Bricks (Class 1)",
      category: "Bricks & Stone",
      sku: "BRK-RED-01",
      price: 9.5,
      unit: "Piece",
      availableQuantity: 45000,
      minOrderQuantity: 3000,
      description: "Uniform kiln-fired first-class red clay bricks with 10.5 N/mm² compressive strength.",
      status: "active",
    },
    {
      vendorId: demoVendor._id,
      name: "Astral CPVC Pro Pipes 1 Inch (3m)",
      category: "Plumbing & Pipes",
      sku: "AST-CPVC-1IN",
      price: 420,
      unit: "Piece",
      availableQuantity: 450,
      minOrderQuantity: 10,
      description: "SDR 11 hot and cold potable water distribution CPVC pipe.",
      status: "active",
    },
  ]);
  console.log("Seeded initial vendor products");

  // 3. Seed Buyer Requirements
  await ProductRequirement.deleteMany({});
  await ProductRequirement.insertMany([
    {
      title: "Need 600 Bags of OPC 53 Grade Cement for High-Rise Project",
      category: "Cement & Sand",
      buyerName: "Vikram Construction Ltd.",
      buyerCompany: "Vikram Infra & Buildcon",
      buyerPhone: "+91 98200 12345",
      buyerEmail: "procurement@vikraminfra.com",
      requiredQuantity: 600,
      unit: "Bag",
      targetPrice: 375,
      deliveryLocation: {
        city: "Thane",
        state: "Maharashtra",
        address: "Sector 15, Ghodbunder Road",
        pincode: "400615",
      },
      deliveryTimeline: "Within 3 Days",
      description: "Require fresh factory-certified 53 Grade cement bags unloaded directly on site.",
      status: "open",
    },
    {
      title: "25 Tons FE 550D TMT Steel 16mm & 20mm for Bridge Abutment",
      category: "Steel & Rebar",
      buyerName: "Metro Rail Infrastructure Group",
      buyerCompany: "MRIG Civil Works",
      buyerPhone: "+91 97110 54321",
      buyerEmail: "purchase@mrigindia.org",
      requiredQuantity: 25,
      unit: "Ton",
      targetPrice: 67000,
      deliveryLocation: {
        city: "Navi Mumbai",
        state: "Maharashtra",
        address: "Plot 4A, Belapur MIDC",
        pincode: "400614",
      },
      deliveryTimeline: "Within 5 Days",
      description: "Mill test certificates (MTC) required prior to batch dispatch.",
      status: "open",
    },
  ]);
  console.log("Seeded buyer requirements");

  // 4. Seed Workforce Requirements
  await VendorWorkforce.deleteMany({ vendorId: demoVendor._id });
  await VendorWorkforce.insertMany([
    {
      vendorId: demoVendor._id,
      title: "Need 12 Warehouse Helpers for Heavy Cement & Steel Unloading",
      workerType: "labour",
      tradeCategory: "Loading & Material Handling Labour",
      workersNeeded: 12,
      skillsRequired: ["Loading / Unloading", "Stacking", "Material Sorting"],
      workLocation: {
        city: "Thane",
        state: "Maharashtra",
        address: "Godown No. 4, Bhiwandi Logistics Hub",
      },
      startDate: new Date().toISOString().split("T")[0],
      duration: "15 Days",
      budgetPerWorker: 650,
      budgetPeriod: "daily",
      description: "Morning shift physical helpers needed for unloading 50kg bags and steel bundles.",
      status: "open",
      applicantCount: 8,
    },
  ]);
  console.log("Seeded workforce requirements");

  await mongoose.disconnect();
  console.log("Seed completed successfully!");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

