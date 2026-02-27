import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const testDBConnection = async () => {
  try {
    console.log("🔌 Testing MongoDB Connection...\n");
    console.log("📋 MONGO_URI:", process.env.MONGO_URI || "❌ NOT SET");
    
    if (!process.env.MONGO_URI) {
      console.error("\n❌ ERROR: MONGO_URI is not set in environment variables!");
      process.exit(1);
    }
    
    console.log("\n⏳ Connecting...");
    
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ MongoDB Connected Successfully!\n");
    console.log("📊 Connection Details:");
    console.log("  • Database Name:", mongoose.connection.db?.databaseName);
    console.log("  • Host:", mongoose.connection.host);
    console.log("  • Port:", mongoose.connection.port);
    console.log("  • State:", mongoose.connection.readyState === 1 ? "Connected" : "Disconnected");
    
    await mongoose.disconnect();
    console.log("\n✅ Test Completed Successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("\n❌ MongoDB Connection Failed!\n");
    console.error("Error Message:", error.message);
    
    if (error.name === "MongoServerSelectionError") {
      console.error("\n💡 Troubleshooting Tips:");
      console.error("  1. Verify your MONGO_URI is correct");
      console.error("  2. Check if MongoDB server is running");
      console.error("  3. Check your internet connection");
      console.error("  4. Verify IP whitelist in MongoDB Atlas (if using cloud)");
    }
    
    process.exit(1);
  }
};

testDBConnection();
