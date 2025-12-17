// src/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// Admin / SubOrgAdmin login (tenant)
router.post("/admin/login", authController.adminLogin);

// SuperAdmin login (master)
router.post("/superadmin/login", authController.superAdminLogin);

// Educator login (tenant)
router.post("/educator/login", authController.educatorLogin);

module.exports = router;
