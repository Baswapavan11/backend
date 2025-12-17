// src/models/tenant/OrgSettings.model.js
const mongoose = require("mongoose");

const OrgSettingsSchema = new mongoose.Schema(
  {
    // ───────────────── BRANDING ─────────────────
    branding: {
      logoUrl: { type: String },
      logoPublicId: { type: String },
      faviconUrl: { type: String },
      primaryColor: { type: String, default: "#2E5BFF" },
      secondaryColor: { type: String, default: "#F2F4FF" },
    },

    // ───────────────── AUTH / SIGNUP ─────────────────
    authPreferences: {
      allowEmailPasswordLogin: { type: Boolean, default: true },
      allowPhoneOtpLogin: { type: Boolean, default: false },
      b2cLearnerSignupEnabled: { type: Boolean, default: true },
      b2cInstructorSignupEnabled: { type: Boolean, default: false },
    },

    // ───────────────── COURSE BUILDER ─────────────────
    courseBuilderSettings: {
      maxActiveCourses: { type: Number, default: 100 },
      maxDraftCourses: { type: Number, default: 200 },
    },

    // ───────────────── NOTIFICATIONS ─────────────────
    notifications: {
      emailFromName: { type: String, default: "Vidhyapat LMS" },
      emailFromAddress: { type: String },
      sendEnrollmentEmails: { type: Boolean, default: true },
      sendCompletionEmails: { type: Boolean, default: true },
      sendCertificateEmails: { type: Boolean, default: true },
    },

    // ───────────────── AUTOMATION: ENROLLMENT / BATCH ─────────────────
    // These flags will be used later by Enrollment + Batch services
    // to auto-assign learners without manual clicks.
    enrollmentAutomation: {
      // Completely turn on/off auto enrollment logic at org level
      autoAssignLearnersToBatch: { type: Boolean, default: false },

      // Which batch statuses are eligible for auto-enrollment
      eligibleBatchStatuses: {
        type: [String],
        default: ["published", "ongoing"],
      },

      // How we pick a batch when multiple batches match
      //  - first_available: first matching by startDate / createdAt
      //  - least_enrolled: pick batch with lowest enrollmentCount
      //  - capacity_priority: prefer batches with more free capacity
      autoAssignStrategy: {
        type: String,
        enum: ["first_available", "least_enrolled", "capacity_priority"],
        default: "first_available",
      },

      // If true, sub-org overrides are respected first
      respectSubOrgOverrides: { type: Boolean, default: true },

      // If you want auto-expiry, we can use this as default (in days)
      defaultEnrollmentDurationDays: { type: Number, default: 90 },
    },

    // ───────────────── AUTOMATION: EDUCATOR ASSIGNMENT ─────────────────
    educatorAutomation: {
      // When a new batch is created, auto-pick educator?
      autoAssignEducatorOnBatchCreate: { type: Boolean, default: false },

      // Strategy when auto-assigning:
      //  - manual: do nothing, admin must choose
      //  - course_default: use default educator for that course (later)
      //  - least_batches: educator with least active/published batches
      //  - round_robin: rotate across educators
      educatorSelectionStrategy: {
        type: String,
        enum: ["manual", "course_default", "least_batches", "round_robin"],
        default: "manual",
      },
    },

    // ───────────────── AUTOMATION: ATTENDANCE ─────────────────
    attendanceAutomation: {
      // Future use: auto-create daily/weekly sessions
      autoCreateDailySessions: { type: Boolean, default: false },

      // Default time if auto sessions are created (e.g., "09:00")
      defaultSessionTime: { type: String, default: "10:00" },

      // If true, learners can mark their own attendance (subject to rules)
      allowSelfCheckIn: { type: Boolean, default: false },
    },

    // ───────────────── AUDIT ─────────────────
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "org_settings",
  }
);

module.exports = OrgSettingsSchema;
