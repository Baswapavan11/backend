// src/models/tenant/Course.model.js
const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, index: true },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    // Meta
    category: { type: String },
    level: { type: String }, // beginner | intermediate | advanced
    language: { type: String, default: "english" },

    // Legacy price fields (kept for compatibility)
    price: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    // Rich pricing meta (used by AddCoursePage & Preview)
    pricing: {
      isFree: { type: Boolean, default: false },
      price: { type: Number, default: 0 },
      discountPercentage: { type: Number, default: 0 },
    },

    thumbnailUrl: { type: String },
    thumbnailName: { type: String },

    // Descriptions & content meta
    subtitle: { type: String },
    shortDescription: { type: String }, // from AddCoursePage
    fullDescription: { type: String },

    // Kept for backwards compatibility / quick summary
    summary: { type: String },

    // Learning content meta
    learningOutcomes: [{ type: String }],
    requirements: [{ type: String }],

    estimatedDurationHours: { type: Number },
    totalLessonsPlanned: { type: Number },

    tags: [{ type: String }],

    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },

    // Who created / updated
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "OrgUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "OrgUser" },

    // Basic stats (can be updated later from curriculum)
    totalLessons: { type: Number, default: 0 },
    totalDurationMinutes: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "courses",
  }
);

module.exports = CourseSchema;
