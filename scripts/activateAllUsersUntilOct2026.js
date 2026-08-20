import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

dotenv.config();

const USER_TYPES = ["labour", "contractor", "sub_contractor"];
const DISPLAY_EXPIRES_AT = new Date("2026-10-01T23:59:59.999+05:30");

const activateUsers = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set in environment variables");
    }

    await connectDB();

    const result = await User.updateMany(
      {
        userType: { $in: USER_TYPES },
        display: { $ne: true },
      },
      {
        $set: {
          display: true,
          displayActivatedAt: new Date(),
          displayExpiresAt: DISPLAY_EXPIRES_AT,
        },
      },
    );

    console.log("Profile visibility activation completed.");
    console.log(`Matched users: ${result.matchedCount}`);
    console.log(`Updated users: ${result.modifiedCount}`);
    console.log(`Valid until: ${DISPLAY_EXPIRES_AT.toISOString()}`);
  } catch (error) {
    console.error("Profile visibility activation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

activateUsers();
