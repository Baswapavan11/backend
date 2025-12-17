// src/routes/learner/attendance.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const learnerAttendanceController = require("../../controllers/learner/attendance.controller");

// Learner must be logged in on tenant
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(["learner"]));

// POST /api/learner/attendance/scan
router.post("/attendance/scan", learnerAttendanceController.scanQr);

module.exports = router;
