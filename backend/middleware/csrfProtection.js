const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => {
    try {
      return new URL(origin.trim()).origin;
    } catch {
      return "";
    }
  })
  .filter(Boolean);

function csrfProtection(req, res, next) {
  if (safeMethods.has(req.method)) {
    return next();
  }

  if (req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ message: "Cross-site requests are not allowed." });
  }

  const origin = req.get("origin");
  if (origin && (!allowedOrigins.includes(origin) || origin === "null")) {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }

  return next();
}

module.exports = csrfProtection;
