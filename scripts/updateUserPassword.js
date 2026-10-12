import dotenv from "dotenv";
import mongoose from "mongoose";
import readline from "node:readline";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

// Load environment variables (.env first, fallback to .env.local if MONGO_URI not found)
dotenv.config();
if (!process.env.MONGO_URI) {
  dotenv.config({ path: ".env.local" });
}

/**
 * Parse CLI arguments supporting positional args, flags (--mobile, --password, -m, -p)
 */
const parseArgs = () => {
  const args = process.argv.slice(2);
  let mobile = null;
  let password = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--mobile" || arg === "-m") {
      mobile = args[++i];
    } else if (arg.startsWith("--mobile=")) {
      mobile = arg.split("=")[1];
    } else if (arg === "--password" || arg === "-p") {
      password = args[++i];
    } else if (arg.startsWith("--password=")) {
      password = arg.split("=")[1];
    } else if (!arg.startsWith("-")) {
      if (!mobile) {
        mobile = arg;
      } else if (!password) {
        password = arg;
      }
    }
  }

  return { mobile, password };
};

/**
 * Generate candidate mobile formats for matching Indian phone numbers in DB
 */
const getMobileCandidates = (inputPhone) => {
  const raw = String(inputPhone || "").trim();
  const digits = raw.replace(/\D/g, "");

  let tenDigit = null;
  if (digits.length === 10) {
    tenDigit = digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    tenDigit = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    tenDigit = digits.slice(2);
  }

  const candidates = new Set([raw, digits]);
  if (tenDigit) {
    candidates.add(tenDigit);
    candidates.add(`+91${tenDigit}`);
    candidates.add(`91${tenDigit}`);
    candidates.add(`0${tenDigit}`);
  }

  return {
    raw,
    digits,
    tenDigit,
    candidates: Array.from(candidates).filter(Boolean),
  };
};

/**
 * Main password update function
 */
const updateUserPassword = async () => {
  let { mobile, password } = parseArgs();

  // If mobile or password missing from CLI args, prompt interactively
  if (!mobile || !password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const lineIterator = rl[Symbol.asyncIterator]();

    const ask = async (promptText) => {
      process.stdout.write(promptText);
      const res = await lineIterator.next();
      return (res.value || "").trim();
    };

    try {
      if (!mobile) {
        mobile = await ask("📱 Enter user Mobile Number: ");
      }
      if (!password) {
        password = await ask("🔑 Enter New Password: ");
      }
    } finally {
      rl.close();
    }
  }

  if (!mobile) {
    console.error("❌ Error: Mobile number is required.");
    process.exitCode = 1;
    return;
  }

  if (!password || password.length < 6) {
    console.error("❌ Error: Password is required and must be at least 6 characters long.");
    process.exitCode = 1;
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGO_URI is not set in environment variables (.env / .env.local).");
    process.exitCode = 1;
    return;
  }

  try {
    await connectDB();

    const { raw, tenDigit, candidates } = getMobileCandidates(mobile);

    console.log(`\n🔍 Searching for user with mobile: "${raw}"...`);

    const queryFilter = {
      $or: [
        { mobile: { $in: candidates } },
        ...(tenDigit ? [{ mobile: new RegExp(`${tenDigit}$`) }] : []),
      ],
    };

    const user = await User.findOne(queryFilter).select("+password");

    if (!user) {
      console.error(`\n❌ User not found with mobile number: "${raw}"`);
      console.error(`Checked candidate formats: ${candidates.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    console.log("\n👤 User found:");
    console.log(`  • ID:        ${user._id}`);
    console.log(`  • Name:      ${user.fullName || "N/A"}`);
    console.log(`  • Mobile:    ${user.mobile}`);
    console.log(`  • Email:     ${user.email || "N/A"}`);
    console.log(`  • Role/Type: ${user.userType || "N/A"}`);
    console.log(`  • Status:    ${user.status || "active"}`);

    // Update password (pre('save') hook will hash with bcrypt)
    user.password = password;

    // Reset any pending reset tokens or OTP locks
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    if (user.OTPstatus) {
      user.OTPstatus = "inactive";
    }

    // Invalidate existing sessions for security
    user.activeSessionId = null;
    user.isLoggedIn = false;

    await user.save();

    // Verify that the password was hashed and compares successfully
    const isValid = await user.matchPassword(password);
    if (!isValid) {
      throw new Error("Password verification check failed after save.");
    }

    console.log("\n✅ Password updated successfully!");
    console.log(`🔑 The user (${user.mobile}) can now log in using the new password.`);
  } catch (error) {
    console.error("\n❌ Failed to update password:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.\n");
  }
};

updateUserPassword();
