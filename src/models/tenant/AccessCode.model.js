const mongoose = require("mongoose");

const AccessCodeSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },

    expiresAt: { type: Date },

    status: {
      type: String,
      enum: ["active", "expired", "disabled"],
      default: "active",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "OrgUser" },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "access_codes",
  }
);

module.exports = AccessCodeSchema;
