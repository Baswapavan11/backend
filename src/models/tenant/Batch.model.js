// src/models/tenant/Batch.model.js
const mongoose = require("mongoose");

const BatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true }, // e.g. "JS-MORNING-2025"

    // Course reference (from course microservice or local courses)
    courseId: {
      type: String,
      required: true,
    },

    // Educator running this batch
    educatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
      required: true,
    },

    subOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubOrg",
    },

    // Mode: online / offline / hybrid
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },

    startDate: { type: Date },
    endDate: { type: Date },

    capacity: { type: Number, default: 0 },
    enrollmentCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "cancelled"],
      default: "draft",
    },

    // Simple schedule; you can extend later
    schedule: {
      daysOfWeek: [{ type: String }], // ["Mon", "Wed", "Fri"]
      startTime: { type: String },    // "10:00"
      endTime: { type: String },      // "11:30"
      timeZone: { type: String },     // "Asia/Kolkata"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "batches",
  }
);

module.exports = BatchSchema;
