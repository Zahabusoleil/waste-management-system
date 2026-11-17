const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ecotrack";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected successfully.");
    return true;
  } catch (error) {
    console.warn("MongoDB unavailable. The app will continue in degraded mode.");
    console.warn(error.message);
    return false;
  }
}

module.exports = { connectDB };
