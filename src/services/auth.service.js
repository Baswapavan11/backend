// src/services/auth.service.js
const bcrypt = require("bcryptjs");
const { Organization, SuperAdmin } = require("../config/masterDB");
const { getTenantConnection } = require("../config/tenantDb");
const jwtUtil = require("../utils/jwt.util");

/**
 * Admin (tenant) login
 * body: { orgSlug, email, password }
 */
async function loginAdmin({ orgSlug, email, password }) {
  if (!orgSlug || !email || !password) {
    const err = new Error("orgSlug, email and password are required");
    err.statusCode = 400;
    throw err;
  }

  // 1) Find org in master DB
  const org = await Organization.findOne({
    slug: orgSlug,
    status: "active",
  }).lean();

  if (!org) {
    const err = new Error("Organization not found or inactive");
    err.statusCode = 404;
    throw err;
  }

  // 2) Get tenant connection
  const tenant = await getTenantConnection(org.dbName);

  if (!tenant || !tenant.models) {
    const err = new Error("Tenant connection or models not initialized");
    err.statusCode = 500;
    throw err;
  }

  const { OrgUser, OrgSettings } = tenant.models;

  if (!OrgUser) {
    const err = new Error("OrgUser model not registered for tenant DB");
    err.statusCode = 500;
    throw err;
  }

  // 3) Find admin/subOrgAdmin by email
  const user = await OrgUser.findOne({
    email,
    role: { $in: ["admin", "subOrgAdmin"] },
    status: "active",
  });

  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // 4) Compare password
  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // 5) Build JWT payload
  const payload = {
    userId: user._id.toString(),
    role: user.role, // "admin" or "subOrgAdmin"
    orgId: org._id.toString(),
    dbName: org.dbName, // e.g., "vidhyapat_dev"
    subOrgId: user.subOrgId ? user.subOrgId.toString() : null,
  };

  const token = jwtUtil.signToken(payload);

  // 6) Update lastLoginAt (optional)
  user.lastLoginAt = new Date();
  await user.save();

  // 7) Load org branding from OrgSettings
  let brandingData = {
    logoUrl: null,
    primaryColor: "#2E5BFF",
    secondaryColor: "#F2F4FF",
  };

  try {
    if (OrgSettings) {
      const settings = await OrgSettings.findOne().lean();

      if (settings && settings.branding) {
        brandingData = {
          logoUrl: settings.branding.logoUrl || null,
          primaryColor: settings.branding.primaryColor || "#2E5BFF",
          secondaryColor: settings.branding.secondaryColor || "#F2F4FF",
        };
      }
    }
  } catch (err) {
    console.warn("Could not load OrgSettings branding:", err.message);
  }

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      subOrgId: user.subOrgId || null,
    },
    org: {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      dbName: org.dbName,
      branding: brandingData,
    },
    token,
  };
}
async function loginEducator({ orgSlug, email, password }) {
  if (!orgSlug || !email || !password) {
    const err = new Error("orgSlug, email and password are required");
    err.statusCode = 400;
    throw err;
  }

  // 1) Find org in master DB
  const org = await Organization.findOne({
    slug: orgSlug,
    status: "active",
  }).lean();

  if (!org) {
    const err = new Error("Organization not found or inactive");
    err.statusCode = 404;
    throw err;
  }

  // 2) Get tenant connection
  const tenant = await getTenantConnection(org.dbName);

  if (!tenant || !tenant.models) {
    const err = new Error("Tenant connection or models not initialized");
    err.statusCode = 500;
    throw err;
  }

  const { OrgUser, OrgSettings } = tenant.models;

  if (!OrgUser) {
    const err = new Error("OrgUser model not registered for tenant DB");
    err.statusCode = 500;
    throw err;
  }

  // 3) Find educator by email
  const user = await OrgUser.findOne({
    email,
    role: "educator",
    status: "active",
  });

  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // 4) Compare password
  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // 5) Build JWT payload
  const payload = {
    userId: user._id.toString(),
    role: user.role, // "educator"
    orgId: org._id.toString(),
    dbName: org.dbName,
    subOrgId: user.subOrgId ? user.subOrgId.toString() : null,
  };

  const token = jwtUtil.signToken(payload);

  // 6) Update lastLoginAt
  user.lastLoginAt = new Date();
  await user.save();

  // 7) Branding (same as admin)
  let brandingData = {
    logoUrl: null,
    primaryColor: "#2E5BFF",
    secondaryColor: "#F2F4FF",
  };

  try {
    if (OrgSettings) {
      const settings = await OrgSettings.findOne().lean();

      if (settings && settings.branding) {
        brandingData = {
          logoUrl: settings.branding.logoUrl || null,
          primaryColor: settings.branding.primaryColor || "#2E5BFF",
          secondaryColor: settings.branding.secondaryColor || "#F2F4FF",
        };
      }
    }
  } catch (err) {
    console.warn("Could not load OrgSettings branding:", err.message);
  }

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      subOrgId: user.subOrgId || null,
    },
    org: {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      dbName: org.dbName,
      branding: brandingData,
    },
    token,
  };
}
/**
 * SuperAdmin login
 * body: { email, password }
 */
async function loginSuperAdmin({ email, password }) {
  if (!email || !password) {
    const err = new Error("email and password are required");
    err.statusCode = 400;
    throw err;
  }

  const superAdmin = await SuperAdmin.findOne({
    email,
    status: "active",
  });

  if (!superAdmin) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, superAdmin.passwordHash || "");
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const payload = {
    userId: superAdmin._id.toString(),
    role: "superadmin",
  };

  const token = jwtUtil.signToken(payload);

  superAdmin.lastLoginAt = new Date();
  await superAdmin.save();

  return {
    user: {
      id: superAdmin._id.toString(),
      name: superAdmin.name,
      email: superAdmin.email,
      role: "superadmin",
    },
    token,
  };
}

module.exports = {
  loginAdmin,
  loginSuperAdmin,
  loginEducator,
};
