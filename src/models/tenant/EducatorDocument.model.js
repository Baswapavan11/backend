// src/models/tenant/EducatorDocument.model.js
const mongoose = require("mongoose");

const EDUCATOR_DOC_TYPES = [
  "idProof",
  "degreeCertificate",
  "experienceCertificate",
  "skillsCertificate",
  "resume",
  "backgroundCheck",
  "other",
];

const EducatorDocumentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    subOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubOrg",
      required: false,
    },
    educatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
      required: true,
    },

    type: {
      type: String,
      enum: EDUCATOR_DOC_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      default: "",
    },
    mimeType: {
      type: String,
      default: "",
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "educator_documents",
    timestamps: false,
  }
);

// helpful index for filtering
EducatorDocumentSchema.index({ educatorId: 1, type: 1 });

module.exports = EducatorDocumentSchema;
module.exports.EDUCATOR_DOC_TYPES = EDUCATOR_DOC_TYPES;
