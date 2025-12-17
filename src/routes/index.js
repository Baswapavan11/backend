// src/routes/index.js
const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const superAdminOrgRoutes = require("./superadmin/organization.routes");
const adminUserRoutes = require("./admin/user.routes");
const adminSubOrgRoutes = require("./admin/suborg.routes");
const adminEducatorRoutes = require("./admin/educator.routes");
const adminMediaRoutes = require("./admin/media.routes");
const courseRoutes = require("./course.routes");
const adminBatchRoutes = require("./admin/batch.routes");
const adminAttendanceRoutes = require("./admin/attendance.routes");
const learnerEnrollmentRoutes = require("./learner/enrollment.routes");
const learnerAttendanceRoutes = require("./learner/attendance.routes");
const superAdminRoutes = require("./superadmin/superadmin.routes");
const educatorAvailabilityRoutes = require("./educator/availability.routes");
const adminEnrollmentRoutes = require("./admin/enrollment.routes");

router.use("/superadmin", superAdminRoutes);

// Auth
router.use("/auth", authRoutes);
// Admin - enrollments (CSV, access codes)
router.use("/admin/enrollments", adminEnrollmentRoutes);

// Educator
router.use("/educator/availability", educatorAvailabilityRoutes);
// Superadmin
router.use("/superadmin/organizations", superAdminOrgRoutes);

// Admin - media
router.use("/admin/media", adminMediaRoutes);

// Admin - users
router.use("/admin/users", adminUserRoutes);

// Admin - sub orgs
router.use("/admin/suborgs", adminSubOrgRoutes);

// 🔹 Admin - educators (this is what your frontend calls)
router.use("/admin/educators", adminEducatorRoutes);
// 🔹 Admin - educators (this is what your frontend calls)
router.use("/courses", courseRoutes);

router.use("/admin/batches", adminBatchRoutes);

router.use("/admin/attendance", adminAttendanceRoutes);

// learner self-enroll
router.use("/learner", learnerEnrollmentRoutes);

router.use("/learner", learnerEnrollmentRoutes);
router.use("/learner", learnerAttendanceRoutes);

module.exports = router;
