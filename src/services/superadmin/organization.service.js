const { Organization } = require("../../config/masterDB");
const { getTenantConnection } = require("../../config/tenantDb");
const mediaService = require("../../services/media.service");


function normalizeSlug(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function deriveDbNameFromSlug(slug) {
  return slug.replace(/-/g, "_");
}

// POST /api/superadmin/organizations  (multipart/form-data)
async function createOrganizationWithMedia(req, res, next) {
  try {
    const {
      name,
      slug,
      dbName: dbNameInput,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      subscriptionPlanCode,
      subscriptionStatus,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "name and slug are required",
      });
    }

    const normalizedSlug = normalizeSlug(slug);
    const dbName = dbNameInput || deriveDbNameFromSlug(normalizedSlug);

    // Check if organization already exists
    const existingOrg = await Organization.findOne({
      $or: [{ slug: normalizedSlug }, { dbName }],
    }).lean();

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: "Organization with same slug or dbName already exists",
      });
    }

    // --- Handle files from multipart/form-data ---
    // req.files.logo[0], req.files.favicon[0]
    const files = req.files || {};
    const logoFile = files.logo && files.logo[0];
    const faviconFile = files.favicon && files.favicon[0];

    if (!logoFile) {
      return res.status(400).json({
        success: false,
        message: "Logo file is required (field name: 'logo')",
      });
    }

    // Upload logo to Cloudinary
    const { logoUrl, logoPublicId } = await mediaService.uploadOrgLogo(
      logoFile.buffer,
      normalizedSlug
    );

    // Upload favicon if provided
    let faviconUrl = null;
    let faviconPublicId = null;

    if (faviconFile) {
      const result = await mediaService.uploadOrgFavicon(
        faviconFile.buffer,
        normalizedSlug
      );
      faviconUrl = result.faviconUrl;
      faviconPublicId = result.faviconPublicId;
    }

    const now = new Date();

    // 1) Create org in master DB
    const org = await Organization.create({
      name,
      slug: normalizedSlug,
      dbName,
      primaryContactName: primaryContactName || null,
      primaryContactEmail: primaryContactEmail || null,
      primaryContactPhone: primaryContactPhone || null,
      status: "active",
      subscriptionPlanCode: subscriptionPlanCode || "PRO",
      subscriptionStatus: subscriptionStatus || "active",
      branding: {
        logoUrl,
        logoPublicId,
        faviconUrl,
        faviconPublicId,
        primaryColor: "#2E5BFF",
        secondaryColor: "#F2F4FF",
      },
      createdAt: now,
      updatedAt: now,
    });

    // 2) Seed tenant org_settings with branding
    try {
      const tenant = await getTenantConnection(dbName);
      const { OrgSettings } = tenant.models;

      if (OrgSettings) {
        let settings = await OrgSettings.findOne();

        if (!settings) {
          settings = new OrgSettings();
        }

        settings.branding = settings.branding || {};
        settings.branding.logoUrl = logoUrl;
        settings.branding.logoPublicId = logoPublicId;
        settings.branding.faviconUrl = faviconUrl;
        settings.branding.faviconPublicId = faviconPublicId;
        settings.branding.primaryColor =
          settings.branding.primaryColor || "#2E5BFF";
        settings.branding.secondaryColor =
          settings.branding.secondaryColor || "#F2F4FF";

        settings.authPreferences = settings.authPreferences || {
          allowEmailPasswordLogin: true,
          allowPhoneOtpLogin: false,
          b2cLearnerSignupEnabled: true,
          b2cInstructorSignupEnabled: false,
        };

        settings.courseBuilderSettings = settings.courseBuilderSettings || {
          maxActiveCourses: 100,
          maxDraftCourses: 200,
        };

        settings.notifications = settings.notifications || {
          emailFromName: name,
          emailFromAddress: primaryContactEmail || null,
          sendEnrollmentEmails: true,
          sendCompletionEmails: true,
          sendCertificateEmails: true,
        };

        settings.updatedAt = new Date();
        await settings.save();

        console.log("Seeded OrgSettings for tenant:", dbName);
      }
    } catch (err) {
      console.warn(
        "Failed to seed tenant OrgSettings for org:",
        normalizedSlug,
        err.message
      );
    }

    return res.status(201).json({
      success: true,
      data: {
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        dbName: org.dbName,
        status: org.status,
        subscriptionPlanCode: org.subscriptionPlanCode,
        subscriptionStatus: org.subscriptionStatus,
        branding: org.branding,
      },
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Simple list organizations (for SuperAdmin UI)
 */
async function listOrganizations() {
  const orgs = await Organization.find().lean();

  return orgs.map((org) => ({
    id: org._id.toString(),
    name: org.name,
    slug: org.slug,
    dbName: org.dbName,
    status: org.status,
    subscriptionPlanCode: org.subscriptionPlanCode,
    subscriptionStatus: org.subscriptionStatus,
    branding: org.branding || {},
    createdAt: org.createdAt,
  }));
}
/**
 * Change organization status (active / inactive / suspended)
 */
async function changeOrganizationStatus({ orgId, status, currentUser }) {
  const allowedStatuses = ["active", "inactive", "suspended"];

  if (!allowedStatuses.includes(status)) {
    const err = new Error(
      "Invalid status. Allowed: active, inactive, suspended"
    );
    err.statusCode = 400;
    throw err;
  }

  if (!currentUser || currentUser.role !== "superadmin") {
    const err = new Error("Forbidden: only superadmin can change org status");
    err.statusCode = 403;
    throw err;
  }

  const org = await Organization.findById(orgId);
  if (!org) {
    const err = new Error("Organization not found");
    err.statusCode = 404;
    throw err;
  }

  org.status = status;
  org.updatedAt = new Date();
  await org.save();

  return {
    id: org._id.toString(),
    name: org.name,
    status: org.status,
  };
}


module.exports = {
  createOrganizationWithMedia,
  listOrganizations,
  changeOrganizationStatus,
};
