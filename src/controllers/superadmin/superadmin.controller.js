// src/controllers/superadmin/superadmin.controller.js
const superAdminService = require("../../services/superadmin/superadmin.service");

async function createSuperAdmin(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const result = await superAdminService.createSuperAdmin({
      name,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Super admin created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
module.exports = {
  createSuperAdmin,
};
