// src/seeds/seedDev.js
require("dotenv").config();
const bcrypt = require("bcryptjs");

const { masterConnection, Organization, SuperAdmin } = require("../config/masterDB");
const { getTenantConnection } = require("../config/tenantDb");

async function seedOrganization({ name, slug, dbName, adminEmail }) {
  // 1) Upsert organization in master DB
  let org = await Organization.findOne({ slug });

  if (!org) {
    org = await Organization.create({
      name,
      slug,
      dbName,
      status: "active",
      subscriptionPlanCode: "PRO",
      subscriptionStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Created org: ${slug}`);
  } else {
    console.log(`Org already exists: ${slug}`);
  }

  // 2) Tenant DB setup
  const tenant = await getTenantConnection(dbName);
  const { OrgUser, OrgSettings } = tenant.models;

  // 3) Create Admin user for tenant if not exists
  const existingAdmin = await OrgUser.findOne({ email: adminEmail });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);

    const admin = await OrgUser.create({
      name: "Dev Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Created admin user: ${admin.email}`);
  } else {
    console.log(`Admin already exists: ${existingAdmin.email}`);
  }

  // 4) Create default org settings if not exists
  const existingSettings = await OrgSettings.findOne();

  if (!existingSettings) {
    await OrgSettings.create({
      branding: {
        primaryColor: "#2E5BFF",
        secondaryColor: "#F2F4FF",
      },
      authPreferences: {
        allowEmailPasswordLogin: true,
        allowPhoneOtpLogin: false,
        b2cLearnerSignupEnabled: true,
        b2cInstructorSignupEnabled: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Created default settings for ${slug}`);
  }
}

async function run() {
  try {
    await masterConnection.asPromise(); // Ensure connected

    console.log("Connected to master DB");

    // ----------------------------------------------------
    // 1) SUPER ADMIN
    // ----------------------------------------------------
    const superAdminEmail = "superadmin@vsaastechnologies.com";
    const existingSuper = await SuperAdmin.findOne({ email: superAdminEmail });

    if (!existingSuper) {
      const passwordHash = await bcrypt.hash("vsaas@2025", 10);

      await SuperAdmin.create({
        name: "Main Super Admin",
        email: superAdminEmail,
        passwordHash,
        role: "superadmin",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("SuperAdmin created:", superAdminEmail);
    } else {
      console.log("SuperAdmin already exists:", existingSuper.email);
    }

    // ----------------------------------------------------
    // 2) ORGANIZATION #1 — Vidhyapat
    // ----------------------------------------------------
    await seedOrganization({
      name: "Vidhyapat Dev Org",
      slug: "vidhyapat-dev",
      dbName: "vidhyapat_dev",
      adminEmail: "admin@vidhyapat.dev",
    });

    // ----------------------------------------------------
    // 3) ORGANIZATION #2 — VSAAS
    // ----------------------------------------------------
    await seedOrganization({
      name: "VSAAS Technologies Org",
      slug: "vsaas-dev",
      dbName: "vsaas_dev",
      adminEmail: "admin@vsaas.dev",
    });

    console.log("Seed completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

run();
