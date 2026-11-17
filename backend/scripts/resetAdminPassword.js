require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db");
const User = require("../models/User");

async function resetAdminPassword() {
  const email = (process.argv[2] || process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.argv[3] || process.env.BOOTSTRAP_ADMIN_PASSWORD || "";

  if (!email) {
    throw new Error("An administrator email is required. Pass it as the first argument or set BOOTSTRAP_ADMIN_EMAIL.");
  }

  if (!password) {
    throw new Error("A password is required. Pass it as the second argument or set BOOTSTRAP_ADMIN_PASSWORD.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  if (!(await connectDB())) {
    throw new Error("Unable to connect to MongoDB; password was not reset.");
  }

  const admin = await User.findOne({ email, role: "admin" });
  if (!admin) {
    throw new Error("No admin account was found for the supplied email. No duplicate admin was created.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.updateOne({ _id: admin._id }, { $set: { password: hashedPassword, status: "active" } });

  console.log("Administrator password updated for the existing admin account.");
}

resetAdminPassword()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
