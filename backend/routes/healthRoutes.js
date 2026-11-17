const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: dbStatus ? "ok" : "degraded",
    service: "EcoTrack",
    database: dbStatus ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
