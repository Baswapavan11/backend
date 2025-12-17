// src/models/tenant/Enrollment.model.js
const mongoose = require("mongoose");

const EnrollmentSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
      required: true,
    },
    subOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubOrg",
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "confirmed",
    },

    // For requirement: who/what created this enrollment
    source: {
      type: String,
      enum: ["admin", "self", "access_code", "import", "csv"],
      default: "admin",
    },

    startDate: { type: Date },
    expiryDate: { type: Date },

    notes: { type: String, trim: true },

    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser", // who enrolled (admin/educator/learner)
    },

    enrolledAt: { type: Date, default: Date.now },
  },
  {
    collection: "enrollments",
  }
);

module.exports = EnrollmentSchema;
