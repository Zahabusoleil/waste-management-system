const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const collectorRoutes = require("./routes/collectorRoutes");
const healthRoutes = require("./routes/healthRoutes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const csrfProtection = require("./middleware/csrfProtection");
const User = require("./models/User");

const app = express();

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const url = new URL(origin);
        if (
          url.hostname.endsWith(".onrender.com") ||
          url.hostname === "localhost" ||
          url.hostname === "127.0.0.1"
        ) {
          return callback(null, true);
        }
      } catch {}

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api", csrfProtection);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/collector", collectorRoutes);
app.use("/api", healthRoutes);

const frontendDir = path.join(__dirname, "../frontend");

const pageMap = [
  ["/", "index.html"],
  ["/about.html", "about.html"],
  ["/login.html", "login.html"],
  ["/register.html", "register.html"],
  ["/reset-password.html", "reset-password.html"],
  ["/privacy-policy.html", "privacy-policy.html"],
  ["/terms.html", "terms.html"],
  ["/cookies-policy.html", "cookies-policy.html"],
];

const requirePageAuth = (requiredRole) => async (req, res, next) => {
  const token = req.cookies?.[process.env.SESSION_NAME || "ecotrack_token"];

  if (!token) {
    return res.redirect("/login.html");
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.redirect("/login.html");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");

    if (!user || user.status !== "active") {
      return res.redirect("/login.html");
    }

    if (requiredRole && user.role !== requiredRole) {
      return res.redirect("/login.html");
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.redirect("/login.html");
  }
};

for (const [route, fileName] of pageMap) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(frontendDir, fileName));
  });
}

app.get("/resident.html", requirePageAuth("resident"), (req, res) => {
  res.sendFile(path.join(frontendDir, "resident.html"));
});

app.get("/admin.html", requirePageAuth("admin"), (req, res) => {
  res.sendFile(path.join(frontendDir, "admin.html"));
});

app.get("/collector.html", requirePageAuth("collector"), (req, res) => {
  res.sendFile(path.join(frontendDir, "collector.html"));
});

app.use(express.static(frontendDir));

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
