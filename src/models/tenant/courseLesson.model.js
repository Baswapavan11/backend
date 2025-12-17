// src/models/tenant/CourseLesson.model.js
const mongoose = require("mongoose");

const CourseLessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSection",
      required: true,
    },

    title: { type: String, required: true },

    type: {
      type: String,
      enum: ["video", "pdf", "text"],
      default: "video",
    },

    // upload | youtube | sharepoint
    videoSource: {
      type: String,
      enum: ["upload", "youtube", "sharepoint"],
      default: "upload",
    },

    // Cloudinary (upload)
    resourceUrl: { type: String },
    resourcePublicId: { type: String },

    // External video URLs
    videoUrl: { type: String }, // YouTube or SharePoint url

    // For text lessons
    textContent: { type: String },

    isPreview: { type: Boolean, default: false },
    durationMinutes: { type: Number },

    order: { type: Number, default: 1 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "course_lessons",
  }
);

module.exports = CourseLessonSchema;
