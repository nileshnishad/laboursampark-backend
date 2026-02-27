import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("🔌 Attempting to connect to MongoDB...");
    console.log("📋 MONGO_URI:", process.env.MONGO_URI || "NOT SET");
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ MongoDB Connected Successfully!");
    console.log("📚  Database Name:", mongoose.connection.db?.databaseName);
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:");
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    process.exit(1);
  }
};

export default connectDB;
