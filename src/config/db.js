import mongoose from "mongoose";

// Cache the connection (and in-flight connection promise) on the global object.
// On serverless platforms (Vercel), the module can be re-evaluated across
// invocations while the underlying process/container stays warm, so without
// this cache every request could open a brand new MongoClient/connection
// pool and quickly exhaust the Atlas M0 connection limit.
const globalForMongoose = globalThis;
let cached = globalForMongoose._mongooseCache;
if (!cached) {
  cached = globalForMongoose._mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  // Already connected (readyState 1) - reuse it.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔌 Attempting to connect to MongoDB...");
    console.log("📋 MONGO_URI:", process.env.MONGO_URI ? "SET" : "NOT SET");

    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Keep the pool small - serverless functions can scale to many
        // concurrent instances, each with its own pool.
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => {
        console.log("✅ MongoDB Connected Successfully!");
        console.log("📚  Database Name:", mongooseInstance.connection.db?.databaseName);
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:");
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    throw error;
  }
};

export default connectDB;
