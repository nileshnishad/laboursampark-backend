import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { readFile } from "node:fs/promises";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

dotenv.config();

const inputPath = process.argv[2];

const addUsers = async () => {
  if (!inputPath) {
    throw new Error("Usage: npm run add-users -- <path-to-json-file>");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  const filePath = path.resolve(process.cwd(), inputPath);
  const parsedData = JSON.parse(await readFile(filePath, "utf8"));
  const users = Array.isArray(parsedData) ? parsedData : [parsedData];

  if (users.length === 0 || users.some((user) => !user || typeof user !== "object" || Array.isArray(user))) {
    throw new Error("JSON must contain a user object or an array of user objects");
  }

  await connectDB();

  let addedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const [index, userData] of users.entries()) {
    try {
      const duplicateConditions = [];
      if (typeof userData.mobile === "string" && userData.mobile.trim()) {
        duplicateConditions.push({ mobile: userData.mobile.trim() });
      }
      if (typeof userData.email === "string" && userData.email.trim()) {
        duplicateConditions.push({ email: userData.email.trim() });
      }

      if (duplicateConditions.length > 0 && await User.exists({ $or: duplicateConditions })) {
        console.log(`Skipped record ${index + 1}: mobile or email already exists.`);
        skippedCount += 1;
        continue;
      }

      await new User(userData).save();
      console.log(`Added record ${index + 1}.`);
      addedCount += 1;
    } catch (error) {
      console.error(`Failed record ${index + 1}: ${error.message}`);
      failedCount += 1;
    }
  }

  console.log(`Finished. Added: ${addedCount}, skipped: ${skippedCount}, failed: ${failedCount}.`);
  if (failedCount > 0) {
    process.exitCode = 1;
  }
};

addUsers()
  .catch((error) => {
    console.error("Could not add users:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });