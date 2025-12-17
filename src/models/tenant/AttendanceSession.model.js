// src/models/tenant/AttendanceSession.model.js
const mongoose = require("mongoose");

const AttendanceSessionSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      required: true,
    },

    // copy of batch schedule for that day
    startTime: { type: String }, // "10:00"
    endTime: { type: String },   // "11:30"
    timeZone: { type: String, default: "Asia/Kolkata" },

    // For offline / hybrid QR scanning
    qrCodeToken: { type: String }, // random string; QR contents
    qrEnabled: { type: Boolean, default: false },

    // Automation flags
    autoOnline: { type: Boolean, default: false }, // true for online automated sessions

    status: {
      type: String,
      enum: ["scheduled", "in-progress", "closed"],
      default: "scheduled",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "OrgUser" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "attendance_sessions",
  }
);

// Prevent duplicates per batch + date + startTime
AttendanceSessionSchema.index(
  { batchId: 1, date: 1, startTime: 1 },
  { unique: true }
);

module.exports = AttendanceSessionSchema;
