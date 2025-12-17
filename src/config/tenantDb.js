// src/config/tenantDb.js
const mongoose = require("mongoose");
const OrgUserSchema = require("../models/tenant/OrgUser.model");
const SubOrgSchema = require("../models/tenant/SubOrg.model");
const OrgSettingsSchema = require("../models/tenant/OrgSettings.model");
const EducatorDocumentSchema = require("../models/tenant/EducatorDocument.model");
const CourseSchema = require("../models/tenant/course.model");
const CourseSectionSchema = require("../models/tenant/courseSection.model");
const CourseLessonSchema = require("../models/tenant/courseLesson.model");
const BatchSchema = require("../models/tenant/Batch.model");
const EnrollmentSchema = require("../models/tenant/Enrollment.model");
const AttendanceSessionSchema = require("../models/tenant/AttendanceSession.model");
const AttendanceRecordSchema = require("../models/tenant/AttendanceRecord.model");
const EducatorAvailabilitySchema = require("../models/tenant/EducatorAvailability.model");
// in-memory cache: dbName -> { conn, models }
const tenantConnections = new Map();
const baseUri = process.env.MONGO_BASE_URI;

if (!baseUri) {
  throw new Error("MONGO_BASE_URI is not set in .env");
}

async function getTenantConnection(dbName) {
  if (!dbName) {
    throw new Error("dbName is required for getTenantConnection");
  }

  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName);
  }

  console.log("Creating tenant connection for DB:", dbName);

  const conn = await mongoose.createConnection(`${baseUri}/${dbName}`);

  const models = {
    OrgUser: conn.model("OrgUser", OrgUserSchema),
    OrgSettings: conn.model("OrgSettings", OrgSettingsSchema),
    SubOrg: conn.model("SubOrg", SubOrgSchema),
    EducatorDocument: conn.model("EducatorDocument", EducatorDocumentSchema),
    Course: conn.model("Course", CourseSchema),
    CourseSection: conn.model("CourseSection", CourseSectionSchema),
    CourseLesson: conn.model("CourseLesson", CourseLessonSchema),
    Batch: conn.model("Batch", BatchSchema),
    Enrollment: conn.model("Enrollment", EnrollmentSchema),
    AttendanceSession: conn.model("AttendanceSession", AttendanceSessionSchema),
    AttendanceRecord: conn.model("AttendanceRecord", AttendanceRecordSchema),

      // ✅ ADD THIS
    EducatorAvailability: conn.model(
    "EducatorAvailability",
    EducatorAvailabilitySchema
  ),
  };

  const tenant = { conn, models };

  console.log("Tenant models for", dbName, "=>", Object.keys(models));

  tenantConnections.set(dbName, tenant);

  return tenant;
}

module.exports = { getTenantConnection };
