import app from "./app.js";
import connectDB from "./config/db.js";

// ==========================================
// 🗄️ DATABASE CONNECTION
// ==========================================

(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
  }
})();

// ==========================================
// 🚀 LOCAL DEVELOPMENT SERVER
// ==========================================

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

// ==========================================
// 🚀 EXPORT FOR VERCEL DEPLOYMENT
// ==========================================

export default app;

