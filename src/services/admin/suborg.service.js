// src/services/admin/suborg.service.js
const bcrypt = require("bcryptjs");

/**
 * List sub-orgs (Admin sees all; SubOrgAdmin sees only their own)
 */
async function listSubOrgs({ SubOrg, currentUser, OrgUser }) {
  const filter = {};

  // If SubOrgAdmin: only show the subOrg he belongs to
  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    filter._id = currentUser.subOrgId;
  }

  const subOrgs = await SubOrg.find(filter).sort({ createdAt: -1 }).lean();

  // Optional: count users per subOrg
  let userCounts = {};
  if (OrgUser) {
    const counts = await OrgUser.aggregate([
      { $match: { subOrgId: { $ne: null } } },
      { $group: { _id: "$subOrgId", count: { $sum: 1 } } },
    ]);

    userCounts = counts.reduce((acc, row) => {
      acc[row._id.toString()] = row.count;
      return acc;
    }, {});
  }

  return subOrgs.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    code: s.code || null,
    description: s.description || null,
    status: s.status,
    createdAt: s.createdAt,
    userCount: userCounts[s._id.toString()] || 0,
  }));
}

/**
 * Get a single sub-org
 */
async function getSubOrg({ SubOrg, currentUser, id }) {
  const subOrg = await SubOrg.findById(id).lean();
  if (!subOrg) {
    const err = new Error("Sub-organization not found");
    err.statusCode = 404;
    throw err;
  }

  // SubOrgAdmin can only see their own subOrg
  if (
    currentUser.role === "subOrgAdmin" &&
    currentUser.subOrgId &&
    String(subOrg._id) !== String(currentUser.subOrgId)
  ) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  return {
    id: subOrg._id.toString(),
    name: subOrg.name,
    code: subOrg.code || null,
    description: subOrg.description || null,
    status: subOrg.status,
    createdAt: subOrg.createdAt,
  };
}

/**
 * Create sub-org only (Admin only)
 */
async function createSubOrg({ SubOrg, currentUser, data }) {
  if (currentUser.role !== "admin") {
    const err = new Error("Only tenant admin can create sub-organizations");
    err.statusCode = 403;
    throw err;
  }

  const { name, code, description } = data;

  if (!name) {
    const err = new Error("name is required");
    err.statusCode = 400;
    throw err;
  }

  // Optional unique code check
  if (code) {
    const existing = await SubOrg.findOne({ code }).lean();
    if (existing) {
      const err = new Error("Sub-organization code already exists");
      err.statusCode = 409;
      throw err;
    }
  }

  const now = new Date();

  const subOrg = await SubOrg.create({
    name,
    code: code || null,
    description: description || null,
    status: "active",
    createdBy: currentUser.userId || null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: subOrg._id.toString(),
    name: subOrg.name,
    code: subOrg.code || null,
    description: subOrg.description || null,
    status: subOrg.status,
  };
}

/**
 * Create sub-org + SubOrgAdmin in one shot (Admin only)
 */
async function createSubOrgWithAdmin({
  SubOrg,
  OrgUser,
  currentUser,
  data,
}) {
  if (currentUser.role !== "admin") {
    const err = new Error("Only tenant admin can create sub-org + admin");
    err.statusCode = 403;
    throw err;
  }

  const {
    name,
    code,
    description,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
  } = data;

  if (!name) {
    const err = new Error("Sub-org name is required");
    err.statusCode = 400;
    throw err;
  }

  if (!adminEmail || !adminPassword || !adminName) {
    const err = new Error(
      "adminName, adminEmail and adminPassword are required to create SubOrgAdmin"
    );
    err.statusCode = 400;
    throw err;
  }

  // Unique code check
  if (code) {
    const existing = await SubOrg.findOne({ code }).lean();
    if (existing) {
      const err = new Error("Sub-organization code already exists");
      err.statusCode = 409;
      throw err;
    }
  }

  // Check email uniqueness for OrgUser
  const existingUser = await OrgUser.findOne({ email: adminEmail }).lean();
  if (existingUser) {
    const err = new Error("Admin email already in use");
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();

  // Create sub-org
  const subOrg = await SubOrg.create({
    name,
    code: code || null,
    description: description || null,
    status: "active",
    createdBy: currentUser.userId || null,
    createdAt: now,
    updatedAt: now,
  });

  // Create SubOrgAdmin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const subOrgAdmin = await OrgUser.create({
    name: adminName,
    email: adminEmail,
    phone: adminPhone || null,
    passwordHash,
    role: "subOrgAdmin",
    status: "active",
    subOrgId: subOrg._id,
    createdBy: currentUser.userId || null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    subOrg: {
      id: subOrg._id.toString(),
      name: subOrg.name,
      code: subOrg.code || null,
      description: subOrg.description || null,
      status: subOrg.status,
    },
    adminUser: {
      id: subOrgAdmin._id.toString(),
      name: subOrgAdmin.name,
      email: subOrgAdmin.email,
      role: subOrgAdmin.role,
      subOrgId: subOrgAdmin.subOrgId.toString(),
    },
  };
}

/**
 * Update sub-org (Admin only)
 */
async function updateSubOrg({ SubOrg, currentUser, id, data }) {
  if (currentUser.role !== "admin") {
    const err = new Error("Only tenant admin can update sub-organizations");
    err.statusCode = 403;
    throw err;
  }

  const subOrg = await SubOrg.findById(id);
  if (!subOrg) {
    const err = new Error("Sub-organization not found");
    err.statusCode = 404;
    throw err;
  }

  if (data.name !== undefined) subOrg.name = data.name;
  if (data.code !== undefined) subOrg.code = data.code || null;
  if (data.description !== undefined) subOrg.description = data.description;

  subOrg.updatedAt = new Date();
  await subOrg.save();

  return {
    id: subOrg._id.toString(),
    name: subOrg.name,
    code: subOrg.code || null,
    description: subOrg.description || null,
    status: subOrg.status,
  };
}

/**
 * Change sub-org status (active/inactive) – Admin only
 */
async function changeSubOrgStatus({ SubOrg, currentUser, id, status }) {
  if (currentUser.role !== "admin") {
    const err = new Error("Only tenant admin can change sub-org status");
    err.statusCode = 403;
    throw err;
  }

  const allowed = ["active", "inactive"];
  if (!allowed.includes(status)) {
    const err = new Error("Invalid status");
    err.statusCode = 400;
    throw err;
  }

  const subOrg = await SubOrg.findById(id);
  if (!subOrg) {
    const err = new Error("Sub-organization not found");
    err.statusCode = 404;
    throw err;
  }

  subOrg.status = status;
  subOrg.updatedAt = new Date();
  await subOrg.save();

  return {
    id: subOrg._id.toString(),
    status: subOrg.status,
  };
}

/**
 * Transfer user from one sub-org to another (Admin only)
 * - subOrgId can be null to move to root org (no sub-org)
 */
async function transferUserSubOrg({ OrgUser, currentUser, userId, subOrgId }) {
  if (currentUser.role !== "admin") {
    const err = new Error("Only tenant admin can transfer users between sub-orgs");
    err.statusCode = 403;
    throw err;
  }

  const user = await OrgUser.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Never allow transfer of main admin to a subOrgAdmin or vice versa (role stays same – just location)
  user.subOrgId = subOrgId || null;
  user.updatedAt = new Date();
  await user.save();

  return {
    id: user._id.toString(),
    subOrgId: user.subOrgId ? user.subOrgId.toString() : null,
  };
}

module.exports = {
  listSubOrgs,
  getSubOrg,
  createSubOrg,
  createSubOrgWithAdmin,
  updateSubOrg,
  changeSubOrgStatus,
  transferUserSubOrg,
};
