// src/services/course.service.js

/**
 * Helper: slugify a string (basic kebab-case)
 */
function slugify(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Helper: ensure slug is unique per tenant
 */
async function generateUniqueSlug(Course, baseSlug) {
  if (!baseSlug) return null;

  let slug = baseSlug;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await Course.findOne({ slug }).select("_id").lean();
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

/**
 * Create a new course
 * Called from POST /api/courses
 */
async function createCourse({ Course, OrgSettings, currentUser, data }) {
  const {
    title,
    slug: slugInput,
    status,
    category,
    level,
    language,
    price,
    currency,
    pricing,
    subtitle,
    shortDescription,
    fullDescription,
    summary,
    learningOutcomes,
    requirements,
    tags,
    seo,
  } = data || {};

  if (!title) {
    const err = new Error("title is required");
    err.statusCode = 400;
    throw err;
  }

  // 1) Build base slug from input or title
  const baseSlug = slugInput ? slugify(slugInput) : slugify(title);
  const finalSlug = await generateUniqueSlug(Course, baseSlug);

  // 2) Determine final status (draft by default)
  let finalStatus = status || "draft";
  if (!["draft", "published", "archived"].includes(finalStatus)) {
    finalStatus = "draft";
  }

  // 3) (Optional) enforce courseBuilderSettings if OrgSettings provided
  if (OrgSettings && finalStatus === "published") {
    const settings = await OrgSettings.findOne().lean();
    if (settings && settings.courseBuilderSettings) {
      const { maxActiveCourses } = settings.courseBuilderSettings;
      if (maxActiveCourses && maxActiveCourses > 0) {
        const activeCount = await Course.countDocuments({
          status: "published",
        });
        if (activeCount >= maxActiveCourses) {
          const err = new Error(
            "Maximum number of active courses reached for this organization"
          );
          err.statusCode = 400;
          throw err;
        }
      }
    }
  }

  // 4) SEO defaults
  const seoData = seo || {};
  if (!seoData.metaTitle) {
    seoData.metaTitle = title;
  }
  if (!seoData.metaDescription && shortDescription) {
    seoData.metaDescription = shortDescription.slice(0, 160);
  }

  // 5) Summary fallback
  const finalSummary = summary || shortDescription || "";

  const now = new Date();

  const courseDoc = await Course.create({
    title,
    slug: finalSlug,
    status: finalStatus,
    category: category || null,
    level: level || null,
    language: language || "english",

    // legacy price + pricing
    price: typeof price === "number" ? price : 0,
    currency: currency || "INR",
    pricing: {
      isFree: pricing && typeof pricing.isFree === "boolean"
        ? pricing.isFree
        : false,
      price:
        pricing && typeof pricing.price === "number" ? pricing.price : 0,
      discountPercentage:
        pricing && typeof pricing.discountPercentage === "number"
          ? pricing.discountPercentage
          : 0,
    },

    // descriptions
    subtitle: subtitle || "",
    shortDescription: shortDescription || "",
    fullDescription: fullDescription || "",
    summary: finalSummary,

    learningOutcomes: Array.isArray(learningOutcomes)
      ? learningOutcomes
      : [],
    requirements: Array.isArray(requirements) ? requirements : [],

    estimatedDurationHours: null,
    totalLessonsPlanned: null,

    tags: Array.isArray(tags) ? tags : [],

    seo: seoData,

    createdBy: currentUser.userId || null,
    updatedBy: currentUser.userId || null,

    totalLessons: 0,
    totalDurationMinutes: 0,

    createdAt: now,
    updatedAt: now,
  });

  return mapCourseForList(courseDoc.toObject());
}

/**
 * List courses with filters + pagination
 */
async function listCourses({ Course, query }) {
  const {
    status,
    q,
    category,
    level,
    tag,
    page = 1,
    limit = 20,
  } = query || {};

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (level) {
    filter.level = level;
  }

  if (tag) {
    filter.tags = tag;
  }

  if (q) {
    const regex = new RegExp(q, "i");
    filter.$or = [{ title: regex }, { shortDescription: regex }];
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Course.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Course.countDocuments(filter),
  ]);

  return {
    items: items.map(mapCourseForList),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get single course by ID
 */
async function getCourseById({ Course, courseId }) {
  const course = await Course.findById(courseId).lean();
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  return mapCourseForDetail(course);
}

/**
 * Update course basic info
 */
async function updateCourse({ Course, courseId, updates }) {
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    "title",
    "slug",
    "status",
    "category",
    "level",
    "language",
    "price",
    "currency",
    "pricing",
    "subtitle",
    "shortDescription",
    "fullDescription",
    "summary",
    "learningOutcomes",
    "requirements",
    "estimatedDurationHours",
    "totalLessonsPlanned",
    "tags",
    "seo",
    "thumbnailUrl",
    "thumbnailName",
  ];

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      course[key] = updates[key];
    }
  }

  // Auto slug if title changed and no slug explicitly passed
  if (!updates.slug && updates.title) {
    const baseSlug = slugify(updates.title);
    course.slug = await generateUniqueSlug(Course, baseSlug);
  }

  course.updatedAt = new Date();
  await course.save();

  return mapCourseForDetail(course.toObject());
}

/**
 * Delete course and cascade delete sections + lessons
 */
async function deleteCourse({
  Course,
  CourseSection,
  CourseLesson,
  courseId,
}) {
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  await CourseLesson.deleteMany({ courseId });
  await CourseSection.deleteMany({ courseId });
  await Course.deleteOne({ _id: courseId });

  return {
    id: courseId,
    deleted: true,
  };
}

/* ========== CURRICULUM ========== */

async function fetchCurriculum({ CourseSection, CourseLesson, courseId }) {
  const sections = await CourseSection.find({ courseId })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const sectionIds = sections.map((s) => s._id);

  const lessons = await CourseLesson.find({
    sectionId: { $in: sectionIds },
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const lessonsBySection = {};
  for (const lesson of lessons) {
    const key = String(lesson.sectionId);
    if (!lessonsBySection[key]) lessonsBySection[key] = [];
    lessonsBySection[key].push(mapLesson(lesson));
  }

  const resultSections = sections.map((s) => ({
    id: s._id.toString(),
    title: s.title,
    order: s.order,
    createdAt: s.createdAt,
    lessons: lessonsBySection[String(s._id)] || [],
  }));

  return resultSections;
}

async function createSection({ Course, CourseSection, courseId, title }) {
  if (!title) {
    const err = new Error("title is required");
    err.statusCode = 400;
    throw err;
  }

  const course = await Course.findById(courseId).lean();
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const lastSection = await CourseSection.findOne({ courseId })
    .sort({ order: -1 })
    .lean();

  const nextOrder = lastSection ? (lastSection.order || 0) + 1 : 1;

  const section = await CourseSection.create({
    courseId,
    title,
    order: nextOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: section._id.toString(),
    title: section.title,
    order: section.order,
    createdAt: section.createdAt,
  };
}

async function updateSection({ CourseSection, sectionId, updates }) {
  const section = await CourseSection.findById(sectionId);
  if (!section) {
    const err = new Error("Section not found");
    err.statusCode = 404;
    throw err;
  }

  if (updates.title !== undefined) {
    section.title = updates.title;
  }
  if (updates.order !== undefined) {
    section.order = updates.order;
  }

  section.updatedAt = new Date();
  await section.save();

  return {
    id: section._id.toString(),
    title: section.title,
    order: section.order,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

async function deleteSection({ CourseSection, CourseLesson, sectionId }) {
  const section = await CourseSection.findById(sectionId);
  if (!section) {
    const err = new Error("Section not found");
    err.statusCode = 404;
    throw err;
  }

  await CourseLesson.deleteMany({ sectionId });
  await CourseSection.deleteOne({ _id: sectionId });

  return {
    id: sectionId,
    deleted: true,
  };
}

/* ========== LESSONS ========== */

async function createLesson({
  Course,
  CourseSection,
  CourseLesson,
  courseId,
  sectionId,
  payload,
}) {
  const { title, type, videoSource, videoUrl, textContent, durationMinutes } =
    payload || {};

  if (!title) {
    const err = new Error("title is required");
    err.statusCode = 400;
    throw err;
  }

  const course = await Course.findById(courseId).lean();
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const section = await CourseSection.findOne({
    _id: sectionId,
    courseId,
  }).lean();

  if (!section) {
    const err = new Error("Section not found for this course");
    err.statusCode = 404;
    throw err;
  }

  const lastLesson = await CourseLesson.findOne({ sectionId })
    .sort({ order: -1 })
    .lean();

  const nextOrder = lastLesson ? (lastLesson.order || 0) + 1 : 1;

  const lessonDoc = await CourseLesson.create({
    courseId,
    sectionId,
    title,
    type: type || "video",
    videoSource: videoSource || "upload",
    videoUrl: videoUrl || null,
    textContent: textContent || null,
    durationMinutes:
      typeof durationMinutes === "number" ? durationMinutes : null,
    isPreview: !!payload.isPreview,
    order: nextOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Auto update course stats
  await recalcCourseStats({ Course, CourseLesson, courseId });

  return mapLesson(lessonDoc.toObject());
}

async function updateLesson({ Course, CourseLesson, lessonId, updates }) {
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) {
    const err = new Error("Lesson not found");
    err.statusCode = 404;
    throw err;
  }

  const fields = [
    "title",
    "type",
    "videoSource",
    "videoUrl",
    "textContent",
    "durationMinutes",
    "isPreview",
    "order",
  ];

  for (const key of fields) {
    if (updates[key] !== undefined) {
      lesson[key] = updates[key];
    }
  }

  lesson.updatedAt = new Date();
  await lesson.save();

  // Recalculate course stats after update
  if (lesson.courseId && Course) {
    await recalcCourseStats({
      Course,
      CourseLesson,
      courseId: lesson.courseId,
    });
  }

  return mapLesson(lesson.toObject());
}

async function deleteLesson({ Course, CourseLesson, lessonId }) {
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) {
    const err = new Error("Lesson not found");
    err.statusCode = 404;
    throw err;
  }

  const courseId = lesson.courseId;

  await CourseLesson.deleteOne({ _id: lessonId });

  if (courseId && Course) {
    await recalcCourseStats({ Course, CourseLesson, courseId });
  }

  return {
    id: lessonId,
    deleted: true,
  };
}

/**
 * After uploading material to Cloudinary,
 * attach resourceUrl/publicId and keep stats updated.
 */
async function attachLessonMaterial({
  Course,
  CourseLesson,
  lessonId,
  resourceUrl,
  resourcePublicId,
}) {
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) {
    const err = new Error("Lesson not found");
    err.statusCode = 404;
    throw err;
  }

  lesson.resourceUrl = resourceUrl;
  lesson.resourcePublicId = resourcePublicId;
  lesson.updatedAt = new Date();

  // If material uploaded, ensure type is at least "video"
  if (!lesson.type) {
    lesson.type = "video";
  }

  await lesson.save();

  if (lesson.courseId && Course) {
    await recalcCourseStats({
      Course,
      CourseLesson,
      courseId: lesson.courseId,
    });
  }

  return mapLesson(lesson.toObject());
}

/* ========== INTERNAL HELPERS ========== */

function mapCourseForList(c) {
  return {
    id: c._id.toString(),
    title: c.title,
    slug: c.slug || null,
    status: c.status,
    category: c.category || null,
    level: c.level || null,
    language: c.language || "english",
    price: c.price || 0,
    currency: c.currency || "INR",
    pricing: c.pricing || {
      isFree: false,
      price: 0,
      discountPercentage: 0,
    },
    thumbnailUrl: c.thumbnailUrl || null,
    shortDescription: c.shortDescription || "",
    tags: Array.isArray(c.tags) ? c.tags : [],
    totalLessons: c.totalLessons || 0,
    totalDurationMinutes: c.totalDurationMinutes || 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function mapCourseForDetail(c) {
  return {
    id: c._id.toString(),
    title: c.title,
    slug: c.slug || null,
    status: c.status,
    category: c.category || null,
    level: c.level || null,
    language: c.language || "english",
    price: c.price || 0,
    currency: c.currency || "INR",
    pricing: c.pricing || {
      isFree: false,
      price: 0,
      discountPercentage: 0,
    },
    thumbnailUrl: c.thumbnailUrl || null,
    thumbnailName: c.thumbnailName || null,
    subtitle: c.subtitle || "",
    shortDescription: c.shortDescription || "",
    fullDescription: c.fullDescription || "",
    summary: c.summary || "",
    learningOutcomes: Array.isArray(c.learningOutcomes)
      ? c.learningOutcomes
      : [],
    requirements: Array.isArray(c.requirements) ? c.requirements : [],
    estimatedDurationHours: c.estimatedDurationHours || null,
    totalLessonsPlanned: c.totalLessonsPlanned || null,
    tags: Array.isArray(c.tags) ? c.tags : [],
    seo: c.seo || {},
    totalLessons: c.totalLessons || 0,
    totalDurationMinutes: c.totalDurationMinutes || 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function mapLesson(l) {
  return {
    id: l._id.toString(),
    courseId: l.courseId ? l.courseId.toString() : null,
    sectionId: l.sectionId ? l.sectionId.toString() : null,
    title: l.title,
    type: l.type,
    videoSource: l.videoSource,
    resourceUrl: l.resourceUrl || null,
    resourcePublicId: l.resourcePublicId || null,
    videoUrl: l.videoUrl || null,
    textContent: l.textContent || null,
    durationMinutes: l.durationMinutes || null,
    isPreview: !!l.isPreview,
    order: l.order || 1,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

/**
 * Recalculate totalLessons + totalDurationMinutes for a course
 */
async function recalcCourseStats({ Course, CourseLesson, courseId }) {
  const lessons = await CourseLesson.find({ courseId })
    .select("durationMinutes")
    .lean();

  const totalLessons = lessons.length;
  const totalDurationMinutes = lessons.reduce((sum, l) => {
    if (typeof l.durationMinutes === "number") {
      return sum + l.durationMinutes;
    }
    return sum;
  }, 0);

  await Course.updateOne(
    { _id: courseId },
    {
      $set: {
        totalLessons,
        totalDurationMinutes,
        estimatedDurationHours:
          totalDurationMinutes > 0 ? totalDurationMinutes / 60 : null,
        updatedAt: new Date(),
      },
    }
  );
}
/**
 * Change course status
 */
async function changeCourseStatus({
  Course,
  courseId,
  status,
  currentUser,
}) {
  const allowedStatuses = ["draft", "published", "archived"];

  if (!allowedStatuses.includes(status)) {
    const err = new Error("Invalid course status");
    err.statusCode = 400;
    throw err;
  }

  // Only admin or educator allowed (already enforced by route)
  if (!["admin", "educator"].includes(currentUser.role)) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  // Educator can change only their own courses
  if (
    currentUser.role === "educator" &&
    String(course.createdBy) !== String(currentUser.userId)
  ) {
    const err = new Error("Educators can only manage their own courses");
    err.statusCode = 403;
    throw err;
  }

  // Status transition rules
  const validTransitions = {
    draft: ["published", "archived"],
    published: ["archived"],
    archived: [],
  };

  if (!validTransitions[course.status]?.includes(status)) {
    const err = new Error(
      `Cannot change course status from '${course.status}' to '${status}'`
    );
    err.statusCode = 400;
    throw err;
  }

  course.status = status;
  course.updatedAt = new Date();

  await course.save();

  return {
    id: course._id.toString(),
    status: course.status,
    updatedAt: course.updatedAt,
  };
}

module.exports = {
  createCourse,
  listCourses,
  getCourseById,
  changeCourseStatus,
  updateCourse,
  deleteCourse,
  fetchCurriculum,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  attachLessonMaterial,
};
