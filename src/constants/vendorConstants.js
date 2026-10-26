/**
 * Global Vendor Constants & Master Data
 * Path: src/constants/vendorConstants.js
 */

export const VENDOR_BUSINESS_TYPES = [
  "Cement & Concrete Suppliers",
  "TMT Steel & Metal Fabrication",
  "Bricks, Blocks & Aggregates",
  "Paints, Waterproofing & Chemicals",
  "Plumbing & Sanitaryware Materials",
  "Electrical Wires, Switches & Fittings",
  "Tiles, Marble & Granite Stone",
  "Plywood, Timber & Hardware",
  "Glass, Aluminium & UPVC Profiles",
  "Heavy Construction Equipment & Machinery Rental",
  "Scaffolding & Shuttering Supplies",
  "Safety Equipment & Industrial Supplies",
  "Multi-Product Construction Material Depot"
];

export const VENDOR_PRODUCT_CATEGORIES = [
  "Cement & Sand",
  "Steel & Rebar",
  "Bricks & Stone",
  "Plumbing & Pipes",
  "Electrical & Lighting",
  "Paints & Finishes",
  "Hardware & Tools",
  "Wood & Timber",
  "Tiles & Flooring",
  "Safety & PPE Gear",
  "Heavy Machinery & Tools"
];

export const WORKFORCE_TRADE_CATEGORIES = [
  "Loading & Material Handling Labour",
  "Civil Masonry & Concrete Workers",
  "Welding & Steel Binding Labour",
  "Plumbing & Drainage Labour",
  "Electrical Wiring & Installation",
  "Carpentry & Shuttering Labour",
  "Painting & Surface Prep Workers",
  "Excavation & Earthwork Operators",
  "Warehouse & Inventory Helpers",
  "General Unskilled Helpers"
];

export const PRODUCT_UNITS = [
  "Piece",
  "Bag",
  "Ton",
  "Kg",
  "Sq.Ft",
  "Cu.Meter",
  "Litre",
  "Bundle",
  "Pair",
  "Box",
  "Meter",
  "Truckload"
];

export const WORKER_TYPES = ["labour", "contractor", "sub_contractor"];

export const KYC_STATUSES = ["verified", "pending_review", "incomplete"];

export const REQUIREMENT_STATUSES = ["open", "quoted", "fulfilled", "cancelled"];

export default {
  VENDOR_BUSINESS_TYPES,
  VENDOR_PRODUCT_CATEGORIES,
  WORKFORCE_TRADE_CATEGORIES,
  PRODUCT_UNITS,
  WORKER_TYPES,
  KYC_STATUSES,
  REQUIREMENT_STATUSES
};

