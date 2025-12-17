// src/routes/admin/batch.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const batchController = require("../../controllers/admin/batch.controller");

// All routes require auth + tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// Admin + SubOrgAdmin + Educator
router.use(roleMiddleware(["admin", "subOrgAdmin", "educator"]));

// GET /api/admin/batches
router.get("/", batchController.listBatches);

// GET /api/admin/batches/:id
router.get("/:id", batchController.getBatch);

// POST /api/admin/batches
router.post("/", batchController.createBatch);

// PATCH /api/admin/batches/:id (change educator, mode, etc.)
router.patch("/:id", batchController.updateBatch);

// PATCH /api/admin/batches/:id/status
router.patch("/:id/status", batchController.changeBatchStatus);

// GET /api/admin/batches/:id/enrollments
router.get("/:id/enrollments", batchController.listBatchEnrollments);

// POST /api/admin/batches/:id/enrollments (single)
router.post("/:id/enrollments", batchController.enrollLearner);

// POST /api/admin/batches/:id/enrollments/bulk (multiple)
router.post("/:id/enrollments/bulk", batchController.bulkEnrollLearners);


module.exports = router;
