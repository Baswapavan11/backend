// src/routes/admin/suborg.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const subOrgController = require("../../controllers/admin/suborg.controller");

// Require admin or subOrgAdmin to access list/view
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(["admin", "subOrgAdmin"]));

// List sub-orgs
// GET /api/admin/suborgs
router.get("/", subOrgController.listSubOrgs);

// Get single sub-org
// GET /api/admin/suborgs/:id
router.get("/:id", subOrgController.getSubOrg);

// Admin only endpoints
router.use(roleMiddleware(["admin"]));

// Create sub-org (no admin)
router.post("/", subOrgController.createSubOrg);

// Create sub-org + SubOrgAdmin in one shot
router.post("/with-admin", subOrgController.createSubOrgWithAdmin);

// Update sub-org
router.patch("/:id", subOrgController.updateSubOrg);

// Change sub-org status
router.patch("/:id/status", subOrgController.changeSubOrgStatus);

// Transfer user between sub-orgs
// PATCH /api/admin/suborgs/transfer-user/:userId
router.patch("/transfer-user/:userId", subOrgController.transferUserSubOrg);

module.exports = router;
