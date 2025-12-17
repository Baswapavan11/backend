// src/routes/course.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const tenantMiddleware = require("../middleware/tenant.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

const courseController = require("../controllers/course.controller");

// All course routes: require auth, tenant, role admin/educator
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(["admin", "educator"]));

/* ========== COURSES ========== */

// POST /api/courses
router.post("/", courseController.createCourse);

// PATCH /api/courses/:courseId/status
router.patch("/:courseId/status",courseController.changeCourseStatus);

// GET /api/courses?status=&page=&limit=
router.get("/", courseController.listCourses);

// GET /api/courses/:courseId
router.get("/:courseId", courseController.getCourse);

// PATCH /api/courses/:courseId
router.patch("/:courseId", courseController.updateCourse);

// DELETE /api/courses/:courseId
router.delete("/:courseId", courseController.deleteCourse);

/* ========== CURRICULUM ========== */

// GET /api/courses/:courseId/curriculum
router.get("/:courseId/curriculum", courseController.getCurriculum);

// POST /api/courses/:courseId/sections
router.post("/:courseId/sections", courseController.createSection);

// PATCH /api/courses/sections/:sectionId
router.patch("/sections/:sectionId", courseController.updateSection);

// DELETE /api/courses/sections/:sectionId
router.delete("/sections/:sectionId", courseController.deleteSection);

/* ========== LESSONS ========== */

// POST /api/courses/:courseId/sections/:sectionId/lessons
router.post(
  "/:courseId/sections/:sectionId/lessons",
  courseController.createLesson
);

// PATCH /api/courses/lessons/:lessonId
router.patch("/lessons/:lessonId", courseController.updateLesson);

// DELETE /api/courses/lessons/:lessonId
router.delete("/lessons/:lessonId", courseController.deleteLesson);

/* ========== LESSON MATERIAL UPLOAD ========== */

// POST /api/courses/lessons/:lessonId/material
router.post(
  "/lessons/:lessonId/material",
  upload.single("file"), // field name: "file"
  courseController.uploadLessonMaterial
);

module.exports = router;
