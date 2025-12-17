// src/controllers/admin/media.controller.js
const mediaService = require("../../services/media.service");

/**
 * Upload organization logo and update tenant OrgSettings.
 * Requires: authMiddleware, tenantMiddleware, roleMiddleware(["admin"])
 * Expects: multipart/form-data with field "logo"
 */
async function uploadOrgLogo(req, res, next) {
  try {
    const user = req.user; // from auth.middleware
    const tenant = req.tenant; // { conn, models } from tenant.middleware
    const orgSlug = req.body.orgSlug || null; // optional override

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Logo file is required (field name: 'logo')",
      });
    }

    const buffer = req.file.buffer;

    // Decide which slug to use for folder naming
    const slugForFolder = orgSlug || user.orgSlug || "unknown-org";

    // 1) Upload to Cloudinary via media service
    const { logoUrl, logoPublicId } = await mediaService.uploadOrgLogo(
      buffer,
      slugForFolder
    );

    // 2) Update tenant's OrgSettings in MongoDB
    const { OrgSettings } = tenant.models;
    let settings = await OrgSettings.findOne();

    if (!settings) {
      settings = new OrgSettings();
    }

    settings.branding = settings.branding || {};
    settings.branding.logoUrl = logoUrl;
    settings.branding.logoPublicId = logoPublicId;
    settings.updatedAt = new Date();

    await settings.save();

    return res.status(200).json({
      success: true,
      data: {
        logoUrl,
        logoPublicId,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadOrgLogo,
};
