const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

/**
 * GET /api/health/full
 */
router.get("/", async (req, res) => {
  try {
    const masterDbState =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    // ✅ Get client IP safely (proxy + direct)
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip;

    res.status(200).json({
      status: "UP",
      service: "LMS Backend",

      client: {
        ip: clientIp,
        userAgent: req.headers["user-agent"] || null,
      },

      uptimeSeconds: Math.floor(process.uptime()),

      memoryUsageMB: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },

      databases: {
        master: masterDbState,
      },

      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "DOWN",
      error: err.message,
    });
  }
});

module.exports = router;
