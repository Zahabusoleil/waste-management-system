const express = require("express");
const { register, login, logout, getCurrentUser, changePassword, resetPassword, forgotPassword, resetPasswordWithToken } = require("../controllers/authController");
const { registerValidation, loginValidation } = require("../validators/authValidator");
const { requireAuth, requireRole } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reset requests. Please try again later." },
});

router.post("/register", registerValidation, register);
router.post("/login", loginLimiter, loginValidation, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);
router.post("/change-password", requireAuth, changePassword);
router.post("/reset-password", requireAuth, requireRole("admin"), resetPassword);
router.post("/forgot-password", forgotLimiter, forgotPassword);
router.post("/reset-password-token", resetPasswordWithToken);

module.exports = router;
