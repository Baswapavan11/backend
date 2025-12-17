// src/controllers/course.controller.js
const courseService = require("../services/course.service");
const mediaService = require("../services/media.service");

async function createCourse(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course, OrgSettings } = tenant.models;

    const currentUser = {
      userId: req.user.userId,
      role: req.user.role,
    };

    const course = await courseService.createCourse({
      Course,
      OrgSettings,
      currentUser,
      data: req.body,
    });

    return res.status(201).json({
      success: true,
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

async function listCourses(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course } = tenant.models;

    const result = await courseService.listCourses({
      Course,
      query: req.query,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getCourse(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course } = tenant.models;

    const course = await courseService.getCourseById({
      Course,
      courseId: req.params.courseId,
    });

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    next(err);
  }
}/**
 * PATCH /api/courses/:courseId/status
 * Body: { status }
 */
async function changeCourseStatus(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course } = tenant.models;

    const currentUser = {
      userId: req.user.userId,
      role: req.user.role,
    };

    const result = await courseService.changeCourseStatus({
      Course,
      courseId: req.params.courseId,
      status: req.body.status,
      currentUser,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course } = tenant.models;

    const course = await courseService.updateCourse({
      Course,
      courseId: req.params.courseId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course, CourseSection, CourseLesson } = tenant.models;

    const result = await courseService.deleteCourse({
      Course,
      CourseSection,
      CourseLesson,
      courseId: req.params.courseId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/* ========== CURRICULUM ========== */

async function getCurriculum(req, res, next) {
  try {
    const tenant = req.tenant;
    const { CourseSection, CourseLesson } = tenant.models;

    const result = await courseService.fetchCurriculum({
      CourseSection,
      CourseLesson,
      courseId: req.params.courseId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function createSection(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course, CourseSection } = tenant.models;
    const courseId = req.params.courseId;
    const { title } = req.body;

    const section = await courseService.createSection({
      Course,
      CourseSection,
      courseId,
      title,
    });

    return res.status(201).json({
      success: true,
      data: section,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSection(req, res, next) {
  try {
    const tenant = req.tenant;
    const { CourseSection } = tenant.models;

    const section = await courseService.updateSection({
      CourseSection,
      sectionId: req.params.sectionId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      data: section,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteSection(req, res, next) {
  try {
    const tenant = req.tenant;
    const { CourseSection, CourseLesson } = tenant.models;

    const result = await courseService.deleteSection({
      CourseSection,
      CourseLesson,
      sectionId: req.params.sectionId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/* ========== LESSONS ========== */

async function createLesson(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course, CourseSection, CourseLesson } = tenant.models;

    const lesson = await courseService.createLesson({
      Course,
      CourseSection,
      CourseLesson,
      courseId: req.params.courseId,
      sectionId: req.params.sectionId,
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

async function updateLesson(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course, CourseLesson } = tenant.models;

    const lesson = await courseService.updateLesson({
      Course,
      CourseLesson,
      lessonId: req.params.lessonId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteLesson(req, res, next) {
  try {
    const tenant = req.tenant;
    const { Course, CourseLesson } = tenant.models;

    const result = await courseService.deleteLesson({
      Course,
      CourseLesson,
      lessonId: req.params.lessonId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/* ========== LESSON MATERIAL UPLOAD (Cloudinary) ========== */

async function uploadLessonMaterial(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "File is required (field name: 'file')",
      });
    }

    const tenant = req.tenant;
    const { Course, CourseLesson } = tenant.models;
    const lessonId = req.params.lessonId;

    const tenantKey = req.user.dbName || "unknown-tenant";
    const buffer = req.file.buffer;

    const uploaded = await mediaService.uploadLessonAsset(
      buffer,
      tenantKey,
      lessonId
    );

    const lesson = await courseService.attachLessonMaterial({
      Course,
      CourseLesson,
      lessonId,
      resourceUrl: uploaded.url,
      resourcePublicId: uploaded.publicId,
    });

    return res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCourse,
  listCourses,
  getCourse,
  changeCourseStatus,
  updateCourse,
  deleteCourse,
  getCurriculum,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadLessonMaterial,
};
