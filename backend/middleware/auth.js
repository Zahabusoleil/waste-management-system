const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  let payload;

  try {
    const token =
      req.cookies?.[process.env.SESSION_NAME || "ecotrack_token"] ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: "Authentication is not configured." });
    }

    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }

  try {
    const user = await User.findById(payload.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive. Contact an administrator." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You are not authorized to access this resource." });
  }

  next();
};

module.exports = { requireAuth, requireRole };
