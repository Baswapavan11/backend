// src/routes/superadmin/superadmin.routes.js
const express = require("express");
const router = express.Router();

const superAdminController = require("../../controllers/superadmin/superadmin.controller");

// Public route — but only works once
router.post("/create", superAdminController.createSuperAdmin);


module.exports = router;
