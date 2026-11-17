require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db");
const User = require("../models/User");

async function createAdmin() {
  const required = [
    "BOOTSTRAP_ADMIN_NAME",
    "BOOTSTRAP_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_PHONE",
    "BOOTSTRAP_ADMIN_LOCATION",
    "BOOTSTRAP_ADMIN_PASSWORD",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing administrator setup values: ${missing.join(", ")}`);
  }

  if (process.env.BOOTSTRAP_ADMIN_PASSWORD.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
  }

  if (!(await connectDB())) {
    throw new Error("Unable to connect to MongoDB; administrator was not created.");
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== "admin") {
      throw new Error("The email already belongs to a non-admin account; no duplicate admin was created.");
    }

    existing.name = process.env.BOOTSTRAP_ADMIN_NAME;
    existing.phone = process.env.BOOTSTRAP_ADMIN_PHONE;
    existing.location = process.env.BOOTSTRAP_ADMIN_LOCATION;
    existing.password = await bcrypt.hash(process.env.BOOTSTRAP_ADMIN_PASSWORD, 10);
    existing.status = "active";
    await existing.save();
    console.log("Existing administrator account updated.");
    return;
  }

  await User.create({
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    email,
    phone: process.env.BOOTSTRAP_ADMIN_PHONE,
    location: process.env.BOOTSTRAP_ADMIN_LOCATION,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    role: "admin",
    status: "active",
  });

  console.log("Administrator account created.");
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
