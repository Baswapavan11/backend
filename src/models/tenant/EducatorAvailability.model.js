const mongoose = require("mongoose");

const EducatorAvailabilitySchema = new mongoose.Schema(
  {
    educatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
      required: true,
    },

    subOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubOrg",
    },

    daysOfWeek: {
      type: [String], // ["Mon","Tue"]
      required: true,
    },

    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true },   // "13:00"

    timeZone: { type: String, default: "Asia/Kolkata" },
    active: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "educator_availability" }
);

EducatorAvailabilitySchema.index(
  { educatorId: 1, daysOfWeek: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

module.exports = EducatorAvailabilitySchema;
