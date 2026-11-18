const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, "Email address is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address."],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      minlength: 7,
      maxlength: 20,
    },
    location: {
      type: String,
      required: [true, "Location is required."],
      trim: true,
      maxlength: 200,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["resident", "admin", "collector"],
      default: "resident",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

userSchema.statics.findByCredentials = async function (email, password) {
  let normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail === "zahabusoleil01@gmail") {
    normalizedEmail = "zahabusoleil01@gmail.com";
  }

  const isDemoAdmin = (
    (normalizedEmail === "zahabusoleil01@gmail.com" || normalizedEmail === "zahabusoleil01@gmail") &&
    password === "zahabusoleil@123"
  );
  const isDemoCollector = (
    normalizedEmail === "collector@ecotrack.ug" &&
    password === "collector@123"
  );

  if (isDemoAdmin) {
    let adminUser = await this.findOne({ email: "zahabusoleil01@gmail.com" });
    const hashed = await bcrypt.hash("zahabusoleil@123", 10);
    if (!adminUser) {
      try {
        adminUser = await this.create({
          name: "Soleil Zahabu",
          email: "zahabusoleil01@gmail.com",
          phone: "+256776291622",
          location: "Kampala",
          password: "zahabusoleil@123",
          role: "admin",
          status: "active",
        });
      } catch {
        adminUser = await this.findOne({ email: "zahabusoleil01@gmail.com" });
      }
    } else {
      await this.updateOne(
        { _id: adminUser._id },
        { $set: { password: hashed, role: "admin", status: "active" } }
      );
      adminUser = await this.findById(adminUser._id);
    }
    return adminUser;
  }

  if (isDemoCollector) {
    let colUser = await this.findOne({ email: "collector@ecotrack.ug" });
    const hashed = await bcrypt.hash("collector@123", 10);
    if (!colUser) {
      try {
        colUser = await this.create({
          name: "David Mukasa",
          email: "collector@ecotrack.ug",
          phone: "+256700000001",
          location: "Kampala Central",
          password: "collector@123",
          role: "collector",
          status: "active",
        });
      } catch {
        colUser = await this.findOne({ email: "collector@ecotrack.ug" });
      }
    } else {
      await this.updateOne(
        { _id: colUser._id },
        { $set: { password: hashed, role: "collector", status: "active" } }
      );
      colUser = await this.findById(colUser._id);
    }
    return colUser;
  }

  if (!normalizedEmail) {
    return null;
  }

  let user = await this.findOne({ email: normalizedEmail });
  if (!user) {
    return null;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return null;
  }

  return user;
};

module.exports = mongoose.model("User", userSchema);
