// src/routes/admin/media.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");
const mediaController = require("../../controllers/admin/media.controller");

// All routes here require admin auth on tenant
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(["admin"]));

// POST /api/admin/media/logo
router.post(
  "/logo",
  upload.single("logo"),        // "logo" = field name in form-data
  mediaController.uploadOrgLogo
);

module.exports = router;
