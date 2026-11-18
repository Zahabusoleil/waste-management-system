const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function getConfiguredOrigins() {
  return [
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ]
    .filter(Boolean)
    .flatMap((val) => val.split(","))
    .map((origin) => {
      try {
        return new URL(origin.trim()).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function csrfProtection(req, res, next) {
  if (safeMethods.has(req.method)) {
    return next();
  }

  if (req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ message: "Cross-site requests are not allowed." });
  }

  const origin = req.get("origin");
  if (!origin) {
    return next();
  }

  if (origin === "null") {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }

  const configured = getConfiguredOrigins();
  if (configured.includes(origin)) {
    return next();
  }

  // Same-origin check: does origin match this server's host?
  const host = req.get("host");
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) {
      return next();
    }
    // Also allow onrender.com deployment domains or local development
    if (
      originUrl.hostname.endsWith(".onrender.com") ||
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1"
    ) {
      return next();
    }
  } catch {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }

  return res.status(403).json({ message: "Request origin is not allowed." });
}

module.exports = csrfProtection;
