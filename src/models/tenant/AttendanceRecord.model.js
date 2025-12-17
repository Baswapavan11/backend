// src/models/tenant/AttendanceRecord.model.js
const mongoose = require("mongoose");

const AttendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "present",
    },

    source: {
      type: String,
      enum: ["qr", "online-auto", "manual"],
      default: "qr",
    },

    checkedInAt: { type: Date, default: Date.now },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "attendance_records",
  }
);

// One record per learner per session
AttendanceRecordSchema.index(
  { sessionId: 1, learnerId: 1 },
  { unique: true }
);

module.exports = AttendanceRecordSchema;
