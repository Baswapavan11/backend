const mongoose = require("mongoose");

// 🔹 Reusable sub-schema for educator weekly availability
const EducatorAvailabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
    },
    // store as "HH:mm" strings – easy to use on frontend
    start: {
      type: String,
      required: true,
      trim: true,
    },
    end: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const OrgUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, trim: true, lowercase: true },
    phone: { type: String },

    passwordHash: { type: String },

    role: {
      type: String,
      enum: ["admin", "subOrgAdmin", "educator", "learner"],
      required: true,
    },

    subOrgId: { type: mongoose.Schema.Types.ObjectId, ref: "SubOrg" },

    // subOrgName is optional and will be populated from SubOrg.name by hooks
    subOrgName: { type: String, trim: true, default: null },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "inactive",
    },

    lastLoginAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "OrgUser" },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // 🔹 Profile avatar (for all roles)
    avatarUrl: { type: String },
    avatarPublicId: { type: String },

    // 🔍 Educator Verification Fields
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "unverified", null],
      default: null,
    },
    verificationNotes: {
      type: String,
      trim: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
    },
    verifiedAt: {
      type: Date,
    },
    verificationReviewedAt: {
      type: Date,
    },
    verificationReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrgUser",
    },
    verificationReviewReason: {
      type: String,
      trim: true,
    },

    verificationDocs: [
      {
        type: {
          type: String,
          default: "OTHER",
        },
        url: String,
        publicId: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // 🧑‍🏫 Educator profile (extended for automation)
    educatorProfile: {
      // Existing fields
      title: { type: String, trim: true },
      bio: { type: String, trim: true },
      highestQualification: { type: String, trim: true },
      yearsOfExperience: { type: Number },
      expertiseAreas: [{ type: String, trim: true }],
      languages: [{ type: String, trim: true }],
      linkedinUrl: { type: String, trim: true },
      portfolioUrl: { type: String, trim: true },

      // 🔹 NEW: Work mode (used for scheduling & load)
      workType: {
        type: String,
        enum: ["fullTime", "partTime"],
        default: "fullTime",
      },

      // 🔹 NEW: High-level skill category (for filtering)
      skillCategory: {
        type: String,
        trim: true, // e.g. "Software Engineering", "Data Science"
      },

      // 🔹 NEW: Courses this educator can teach (ids or slugs)
      teachesCourses: [
        {
          type: String,
          trim: true, // you can store courseId, code, or slug here
        },
      ],

      // 🔹 NEW: Weekly availability slots
      availableSlots: {
        type: [EducatorAvailabilitySlotSchema],
        default: [],
      },
    },

    // optional automation flags / metadata
    autoEnrollEnabled: { type: Boolean, default: false },
    defaultTrack: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: "org_users",
  }
);

module.exports = OrgUserSchema;
