// src/models/tenant/CourseSection.model.js
const mongoose = require("mongoose");

const CourseSectionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true },
    order: { type: Number, default: 1 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "course_sections",
  }
);

module.exports = CourseSectionSchema;
