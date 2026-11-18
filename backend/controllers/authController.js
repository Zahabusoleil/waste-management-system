const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const { logAudit } = require("../services/auditService");

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured.");
  }

  return process.env.JWT_SECRET;
};

const createToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), {
    expiresIn: "7d",
  });

const setAuthCookie = (res, token) => {
  res.cookie(process.env.SESSION_NAME || "ecotrack_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  location: user.location,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

const register = async (req, res, next) => {
  try {
    const { name, email, phone, location, password } = req.body;

    if (req.body.role && req.body.role !== "resident") {
      return res.status(400).json({ message: "Public registration is limited to residents only." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const existingUser = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      phone,
      location,
      password,
      role: "resident",
      status: "active",
    });

    const token = createToken(user);
    setAuthCookie(res, token);

    await logAudit("user_registered", user._id, { email: user.email }, "User", user._id.toString());

    res.status(201).json({
      message: "Registration successful.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const user = await User.findByCredentials(req.body.email, req.body.password);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.clearCookie(process.env.SESSION_NAME || "ecotrack_token", { path: "/" });
  res.status(200).json({ message: "Logged out successfully." });
};

const getCurrentUser = async (req, res) => {
  res.status(200).json({ user: sanitizeUser(req.user) });
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Old password, new password, and confirmation are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Password confirmation does not match." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isValid = await user.comparePassword(oldPassword);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logAudit("password_changed", user._id, { email: user.email }, "User", user._id.toString());

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Email, new password, and confirmation are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Password confirmation does not match." });
    }

    const targetEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logAudit("password_reset", req.user._id, { targetUserId: user._id.toString(), email: user.email }, "User", user._id.toString());

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email address is required." });
    }

    const user = await User.findOne({ email });
    // Always return success to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        message: "If that email exists in our system, password reset instructions have been prepared.",
      });
    }

    const rawToken = await PasswordResetToken.createForUser(user._id);
    // Use the Origin header from the request so the link works on any host
    const origin = req.get("origin") || req.get("referer")?.replace(/\/[^/]*$/, "") || process.env.FRONTEND_URL || "";
    const resetLink = `${origin}/reset-password.html?token=${rawToken}`;

    await logAudit("password_reset_requested", user._id, { email: user.email }, "User", user._id.toString());

    // We return the WhatsApp contact & reset link in the response so the
    // system operator can relay it via WhatsApp as instructed.
    return res.status(200).json({
      message: "Password reset request verified. The reset instructions are ready.",
      resetLink,
      whatsappNumber: process.env.ADMIN_WHATSAPP || "+256776291622",
      userName: user.name,
      userEmail: user.email,
      expiresIn: "1 hour",
    });
  } catch (error) {
    next(error);
  }
};

const resetPasswordWithToken = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Token, new password, and confirmation are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const userId = await PasswordResetToken.verifyAndConsume(token);
    if (!userId) {
      return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logAudit("password_reset_completed", user._id, { email: user.email }, "User", user._id.toString());

    return res.status(200).json({ message: "Password reset successfully. You can now sign in with your new password." });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout, getCurrentUser, changePassword, resetPassword, forgotPassword, resetPasswordWithToken };
