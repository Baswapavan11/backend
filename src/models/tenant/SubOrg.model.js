// src/models/tenant/SubOrg.model.js
const mongoose = require("mongoose");

const SubOrgSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, trim: true }, // optional short code like "CSE-2025"

    description: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // tenant-level org implied by DB; this is sub-org inside that tenant
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "OrgUser" },

    // ───────────────── AUTOMATION OVERRIDES ─────────────────
    // These are optional. If null, org-level OrgSettings automation is used.
    automationOverrides: {
      // If set, overrides OrgSettings.enrollmentAutomation.autoAssignLearnersToBatch
      autoAssignLearnersToBatch: { type: Boolean },

      // If set, we can route new learners of this sub-org always to this course
      // when we implement auto-enrollment logic.
      defaultCourseId: { type: String },

      // If set, new learners of this sub-org are auto-enrolled into this batch
      // (subject to capacity/status checks).
      defaultBatchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
      },

      // Default educator for auto-assignment for this sub-org
      defaultEducatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrgUser",
      },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "sub_orgs",
  }
);

module.exports = SubOrgSchema;
