// src/controllers/superadmin/organization.controller.js
const bcrypt = require("bcryptjs");
const { Organization } = require("../../config/masterDB");
const { getTenantConnection } = require("../../config/tenantDb");
const mediaService = require("../../services/media.service");
const organizationService = require("../../services/superadmin/organization.service");

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

// POST /api/superadmin/organizations (multipart/form-data)
async function createOrganizationWithMedia(req, res, next) {
  try {
    const {
      name,
      slug, // optional now
      dbName: dbNameInput, // optional now
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      subscriptionPlanCode,
      subscriptionStatus,
      adminPassword, // optional custom admin password
    } = req.body;

    // Only name + primaryContactEmail are mandatory
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    if (!primaryContactEmail) {
      return res.status(400).json({
        success: false,
        message:
          "primaryContactEmail is required (used as admin login email)",
      });
    }

    // If slug is not given, derive from name
    const normalizedSlug = slug ? normalizeSlug(slug) : normalizeSlug(name);

    // If dbName is not given, derive from slug
    const dbName = dbNameInput || deriveDbNameFromSlug(normalizedSlug);

    // 1) Check if organization already exists in master
    const existingOrg = await Organization.findOne({
      $or: [{ slug: normalizedSlug }, { dbName }],
    }).lean();

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: "Organization with same slug or dbName already exists",
      });
    }

    // 2) Handle files (logo, favicon) from multipart/form-data
    const files = req.files || {};
    const logoFile = files.logo && files.logo[0];
    const faviconFile = files.favicon && files.favicon[0];

    if (!logoFile) {
      return res.status(400).json({
        success: false,
        message: "Logo file is required (field name: 'logo')",
      });
    }

    // 3) Upload logo to Cloudinary
    const { logoUrl, logoPublicId } = await mediaService.uploadOrgLogo(
      logoFile.buffer,
      normalizedSlug
    );

    // 4) Upload favicon to Cloudinary (optional)
    let faviconUrl = null;
    let faviconPublicId = null;

    if (faviconFile) {
      const fav = await mediaService.uploadOrgFavicon(
        faviconFile.buffer,
        normalizedSlug
      );
      faviconUrl = fav.faviconUrl;
      faviconPublicId = fav.faviconPublicId;
    }

    const now = new Date();

    // 5) Create organization in master DB (NO heavy settings here)
    const org = await Organization.create({
      name,
      slug: normalizedSlug,
      dbName,
      primaryContactName: primaryContactName || null,
      primaryContactEmail: primaryContactEmail || null,
      primaryContactPhone: primaryContactPhone || null,
      status: "inactive",
      subscriptionPlanCode: subscriptionPlanCode || "PRO",
      subscriptionStatus: subscriptionStatus || "active",
      createdAt: now,
      updatedAt: now,
      // NOTE: branding is kept minimal in master,
      // real branding lives in tenant OrgSettings.
    });

    // 6) Init tenant DB: org_settings + admin user
    let generatedAdminPassword = adminPassword || "Admin@123";

    try {
      const tenant = await getTenantConnection(dbName);
      const { OrgSettings, OrgUser } = tenant.models;

      // 6a) Create/Update org_settings with branding + automation defaults
      if (OrgSettings) {
        let settings = await OrgSettings.findOne();
        if (!settings) {
          settings = new OrgSettings();
        }

        // ───── Branding ─────
        settings.branding = settings.branding || {};
        settings.branding.logoUrl = logoUrl;
        settings.branding.logoPublicId = logoPublicId;
        settings.branding.faviconUrl = faviconUrl;
        settings.branding.faviconPublicId = faviconPublicId;
        settings.branding.primaryColor =
          settings.branding.primaryColor || "#2E5BFF";
        settings.branding.secondaryColor =
          settings.branding.secondaryColor || "#F2F4FF";

        // ───── Auth defaults ─────
        settings.authPreferences = settings.authPreferences || {
          allowEmailPasswordLogin: true,
          allowPhoneOtpLogin: false,
          b2cLearnerSignupEnabled: true,
          b2cInstructorSignupEnabled: false,
        };

        // ───── Course builder defaults ─────
        settings.courseBuilderSettings =
          settings.courseBuilderSettings || {
            maxActiveCourses: 100,
            maxDraftCourses: 200,
          };

        // ───── Notification defaults ─────
        settings.notifications = settings.notifications || {
          emailFromName: name,
          emailFromAddress: primaryContactEmail || null,
          sendEnrollmentEmails: true,
          sendCompletionEmails: true,
          sendCertificateEmails: true,
        };

        // ───── Automation defaults (NEW) ─────
        settings.enrollmentAutomation =
          settings.enrollmentAutomation || {
            autoAssignLearnersToBatch: false,
            eligibleBatchStatuses: ["published", "ongoing"],
            autoAssignStrategy: "first_available",
            respectSubOrgOverrides: true,
            defaultEnrollmentDurationDays: 90,
          };

        settings.educatorAutomation =
          settings.educatorAutomation || {
            autoAssignEducatorOnBatchCreate: false,
            educatorSelectionStrategy: "manual",
          };

        settings.attendanceAutomation =
          settings.attendanceAutomation || {
            autoCreateDailySessions: false,
            defaultSessionTime: "10:00",
            allowSelfCheckIn: false,
          };

        settings.updatedAt = new Date();
        await settings.save();

        console.log("Seeded OrgSettings for tenant:", dbName);
      }

      // 6b) Create default Admin user in tenant org_users
      if (OrgUser) {
        const passwordHash = await bcrypt.hash(generatedAdminPassword, 10);

        const existingAdmin = await OrgUser.findOne({
          email: primaryContactEmail,
          role: "admin",
        });

        if (!existingAdmin) {
          const adminUser = await OrgUser.create({
            name: primaryContactName || "Organization Admin",
            email: primaryContactEmail,
            passwordHash,
            role: "admin",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log(
            "Created default admin user for org:",
            normalizedSlug,
            adminUser.email
          );
        } else {
          console.log(
            "Admin already exists for org, skipping create:",
            existingAdmin.email
          );
        }
      }
    } catch (err) {
      console.error(
        "Error seeding tenant DB (org_settings/admin user):",
        err.message
      );
    }

    // 7) Return response with org + admin login details
    return res.status(201).json({
      success: true,
      data: {
        organization: {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          dbName: org.dbName,
          status: org.status,
          subscriptionPlanCode: org.subscriptionPlanCode,
          subscriptionStatus: org.subscriptionStatus,
        },
        branding: {
          logoUrl,
          logoPublicId,
          faviconUrl,
          faviconPublicId,
          primaryColor: "#2E5BFF",
          secondaryColor: "#F2F4FF",
        },
        adminCredentials: {
          email: primaryContactEmail,
          password: generatedAdminPassword,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/superadmin/organizations
async function listOrganizations(req, res, next) {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();

    const mapped = orgs.map((org) => ({
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      dbName: org.dbName,
      status: org.status,
      subscriptionPlanCode: org.subscriptionPlanCode,
      subscriptionStatus: org.subscriptionStatus,
      primaryContactName: org.primaryContactName || null,
      primaryContactEmail: org.primaryContactEmail || null,
      primaryContactPhone: org.primaryContactPhone || null,
      createdAt: org.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: mapped,
    });
  } catch (err) {
    next(err);
  }
}
async function changeOrganizationStatus(req, res, next) {
  try {
    const currentUser = {
      userId: req.user.userId,
      role: req.user.role,
    };

    const result = await organizationService.changeOrganizationStatus({
      orgId: req.params.id,
      status: req.body.status,
      currentUser,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrganizationWithMedia,
  listOrganizations,
  changeOrganizationStatus,
};
