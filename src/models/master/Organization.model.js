// src/models/master/Organization.model.js
const mongoose = require("mongoose");

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },          // Org display name
    slug: { type: String, required: true, unique: true }, // "vidhyapat-dev"
    dbName: { type: String, required: true, unique: true }, // "vidhyapat_dev"

    primaryContactName: { type: String },
    primaryContactEmail: { type: String },
    primaryContactPhone: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    subscriptionPlanCode: { type: String }, // e.g. "PRO"
    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "active",
    },

    domain: { type: String }, // optional white-label domain

    branding: {
      logoUrl: { type: String },
      primaryColor: { type: String },
    },

    courseBuilderOverrides: {
      maxActiveCourses: { type: Number },
      maxDraftCourses: { type: Number },
      maxSectionsPerCourse: { type: Number },
      maxLessonsPerSection: { type: Number },
      allowedContentTypes: [{ type: String }],
      allowQuestionBanks: { type: Boolean },
      allowAssignments: { type: Boolean },
      allowDripScheduling: { type: Boolean },
      allowPrerequisites: { type: Boolean },
      allowCertificatesPerCourse: { type: Boolean },
    },

    featureFlags: {
      enableB2CSignup: { type: Boolean, default: true },
      enablePhoneOtpLogin: { type: Boolean, default: false },
      enablePublicCourseCatalog: { type: Boolean, default: false },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "organizations",
  }
);

module.exports = OrganizationSchema;
