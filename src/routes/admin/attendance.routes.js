// src/routes/admin/attendance.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const attendanceController = require("../../controllers/admin/attendance.controller");

// Admin + SubOrgAdmin + Educator (educator mostly for view)
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(["admin", "subOrgAdmin", "educator"]));

// Generate/regenerate sessions for a batch
// POST /api/admin/attendance/batches/:batchId/sessions/generate
router.post(
  "/batches/:batchId/sessions/generate",
  attendanceController.generateSessions
);

// List sessions for a batch
// GET /api/admin/attendance/batches/:batchId/sessions
router.get(
  "/batches/:batchId/sessions",
  attendanceController.listBatchSessions
);

// Get single session + records
// GET /api/admin/attendance/sessions/:sessionId
router.get("/sessions/:sessionId", attendanceController.getSession);

// Auto mark online attendance
// POST /api/admin/attendance/sessions/:sessionId/auto-online
router.post(
  "/sessions/:sessionId/auto-online",
  attendanceController.autoOnline
);

module.exports = router;
