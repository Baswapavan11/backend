// src/routes/admin/educator.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const tenantMiddleware = require("../../middleware/tenant.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");
const educatorController = require("../../controllers/admin/educator.controller");

// All routes require auth + tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// Admin, SubOrgAdmin, Educator (controller enforces extra rules)
router.use(roleMiddleware(["admin", "subOrgAdmin", "educator"]));

/**
 * List educators (optional verification filter)
 * GET /api/admin/educators
 */
router.get("/", educatorController.listEducatorsForVerification);

/**
 * Fetch educator full profile + verification + documents
 * GET /api/admin/educators/:id
 */
router.get("/:id", educatorController.getEducatorVerificationById);

/**
 * Get educator verification status
 * GET /api/admin/educators/:id/verification-status
 */
router.get("/:id/verification-status", educatorController.getVerificationStatusById);

/**
 * Update educator profile section
 * PATCH /api/admin/educators/:id/profile
 */
router.patch("/:id/profile", educatorController.updateEducatorProfile);

/**
 * Upload Educator Avatar
 * POST /api/admin/educators/:id/avatar
 * multipart/form-data → avatar
 */
router.post(
  "/:id/avatar",
  upload.single("avatar"),
  educatorController.uploadEducatorAvatarController   // ✅ Correct function name
);

/**
 * Upload verification document
 * POST /api/admin/educators/:id/documents
 * form-data: file (file), type, title, description
 */
router.post(
  "/:id/documents",
  upload.single("file"),
  educatorController.uploadVerificationDoc
);

/**
 * Delete educator document
 * DELETE /api/admin/educators/:id/documents/:docId
 */
router.delete("/:id/documents/:docId", educatorController.deleteEducatorDocument);

/**
 * Approve / reject educator
 * PATCH /api/admin/educators/:id/verify
 */
router.patch("/:id/verify", educatorController.updateEducatorVerificationStatus);

module.exports = router;
