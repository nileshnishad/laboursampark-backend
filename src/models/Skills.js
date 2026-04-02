import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    lang: {
      type: [
        {
          type: String,
          enum: ["hi", "en", "mr"],
          lowercase: true,
          trim: true,
        },
      ],
      default: ["hi", "en", "mr"],
    },
    subcategory: {},
    relatedSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
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

const Skills = mongoose.model("Skill", skillSchema);

export default Skills;
