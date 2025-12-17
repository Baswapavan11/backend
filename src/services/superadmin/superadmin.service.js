// src/services/superadmin/superadmin.service.js
const bcrypt = require("bcryptjs");
const { SuperAdmin } = require("../../config/masterDB"); // from master connection

async function createSuperAdmin({ name, email, password }) {
  // Step 1: Check if super admin already exists
  const existing = await SuperAdmin.findOne({});
  if (existing) {
    const err = new Error("A super admin already exists. Cannot create another.");
    err.statusCode = 400;
    throw err;
  }

  // Step 2: Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Step 3: Create Super Admin
  const admin = await SuperAdmin.create({
    name,
    email,
    passwordHash,
    role: "superadmin",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}

module.exports = {
  createSuperAdmin,
};
