import mongoose from "mongoose";

const mobileBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    bannerImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: String,
      trim: true,
      default: "",
    },
    visible: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const MobileBanner = mongoose.model("MobileBanner", mobileBannerSchema);

export default MobileBanner;