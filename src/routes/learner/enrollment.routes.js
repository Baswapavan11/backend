// src/routes/learner/enrollment.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const batchController = require("../../controllers/admin/batch.controller");

// All learner routes require auth + tenant + learner role
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(["learner"]));

// POST /api/learner/batches/:id/enroll
router.post("/batches/:id/enroll", batchController.selfEnroll);

module.exports = router;
