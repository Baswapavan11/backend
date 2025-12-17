// src/routes/superadmin/organization.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");
const orgController = require("../../controllers/superadmin/organization.controller");

// All routes require SuperAdmin auth
router.use(authMiddleware);
router.use(roleMiddleware(["superadmin"]));

// Debug: confirm we have the right types
console.log(
  "upload.fields type:",
  typeof upload.fields,
  "createOrganizationWithMedia type:",
  typeof orgController.createOrganizationWithMedia
);

// POST /api/superadmin/organizations
// multipart/form-data: fields + files (logo, favicon)
router.post(
  "/",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  orgController.createOrganizationWithMedia
);

// Change organization status
// PATCH /api/superadmin/organizations/:id/status
router.patch("/:id/status", orgController.changeOrganizationStatus);

router.get("",orgController.listOrganizations);

module.exports = router;
