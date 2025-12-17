// src/middleware/tenant.middleware.js
const { Organization } = require("../config/masterDB");
const { getTenantConnection } = require("../config/tenantDb");

async function tenantMiddleware(req, res, next) {
  try {
    const user = req.user || {};

    // Prefer dbName from token (set during loginAdmin)
    let { dbName, orgId } = user;

    if (!dbName && !orgId) {
      return res.status(400).json({
        success: false,
        message: "No organization info in token",
        code: "TENANT_NOT_FOUND",
      });
    }

    // Optional: if dbName missing but orgId present, look up org
    if (!dbName && orgId) {
      const org = await Organization.findById(orgId).lean();
      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
          code: "TENANT_NOT_FOUND",
        });
      }
      dbName = org.dbName;
    }

    if (!dbName) {
      return res.status(400).json({
        success: false,
        message: "Tenant database name is missing",
        code: "TENANT_NOT_FOUND",
      });
    }

    const tenant = await getTenantConnection(dbName);
    // tenant = { conn, models: { OrgUser, OrgSettings, ... } }
    req.tenant = tenant;

    next();
  } catch (err) {
    console.error("tenantMiddleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve tenant",
      code: "TENANT_RESOLVE_ERROR",
    });
  }
}

module.exports = tenantMiddleware;
