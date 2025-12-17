// src/routes/admin/enrollment.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth.middleware");
const tenant = require("../../middleware/tenant.middleware");
const role = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");

const ctrl = require("../../controllers/admin/enrollment.controller");

router.use(auth, tenant, role(["admin", "subOrgAdmin"]));

/* ================= ACCESS CODES ================= */

// Generate access code
// POST /api/admin/enrollments/batches/:batchId/access-code
router.post(
  "/batches/:batchId/access-code",
  ctrl.generateAccessCode
);

/* ================= CSV ENROLLMENT ================= */

// Upload CSV (creates PENDING enrollments)
// POST /api/admin/enrollments/batches/:batchId/csv
router.post(
  "/batches/:batchId/csv",
  upload.single("file"),
  ctrl.uploadEnrollmentCsv
);

/* ================= FINALIZATION ================= */

// Finalize single enrollment
// PATCH /api/admin/enrollments/:enrollmentId/finalize
router.patch(
  "/:enrollmentId/finalize",
  ctrl.finalizeEnrollment
);

// (Optional – future)
// PATCH /api/admin/enrollments/finalize/bulk
// router.patch("/finalize/bulk", ctrl.bulkFinalizeEnrollments);

module.exports = router;
