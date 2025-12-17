// src/services/admin/batch.service.js
// Pure business logic: all models are passed in from controllers.

const mongoose = require("mongoose");

/**
 * Utility: convert "HH:MM" -> minutes since midnight
 */
function timeToMinutes(str) {
  if (!str || typeof str !== "string") return null;
  const [h, m] = str.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Utility: check if two date ranges overlap
 */
function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !bStart) return false;
  const startA = new Date(aStart).getTime();
  const endA = aEnd ? new Date(aEnd).getTime() : startA;
  const startB = new Date(bStart).getTime();
  const endB = bEnd ? new Date(bEnd).getTime() : startB;

  return startA <= endB && startB <= endA;
}

/**
 * Utility: check if two time ranges overlap (minutes)
 */
function timeRangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (aStart == null || bStart == null) return false;
  const ae = aEnd != null ? aEnd : aStart;
  const be = bEnd != null ? bEnd : bStart;
  return aStart < be && bStart < ae;
}

/**
 * Check if an educator already has conflicting batch in same time window.
 */
async function hasScheduleConflict({
  Batch,
  educatorId,
  newBatch,
}) {
  const {
    schedule,
    startDate,
    endDate,
    _id: batchIdToExclude,
  } = newBatch;

  if (!schedule || !schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
    return false;
  }

  const days = schedule.daysOfWeek;
  const newStartMinutes = timeToMinutes(schedule.startTime);
  const newEndMinutes = timeToMinutes(schedule.endTime);

  const existing = await Batch.find({
    educatorId,
    _id: { $ne: batchIdToExclude || undefined },
    status: { $in: ["draft", "published", "ongoing"] },
    "schedule.daysOfWeek": { $in: days },
  }).lean();

  for (const b of existing) {
    if (
      dateRangesOverlap(startDate, endDate, b.startDate, b.endDate) &&
      b.schedule &&
      timeRangesOverlap(
        newStartMinutes,
        newEndMinutes,
        timeToMinutes(b.schedule.startTime),
        timeToMinutes(b.schedule.endTime)
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Auto pick an educator:
 *  - active, role=educator, verificationStatus=approved
 *  - same subOrg if provided
 *  - no schedule conflict for given time window
 */
async function pickEducatorForBatch({
  OrgUser,
  Batch,
  EducatorAvailability, // ⬅ ADD
  subOrgId,
  schedule,
  startDate,
  endDate,
}) {
  const educators = await OrgUser.find({
    role: "educator",
    status: "active",
    verificationStatus: "approved",
    ...(subOrgId ? { subOrgId } : {}),
  }).lean();

  for (const edu of educators) {
    const availability = await EducatorAvailability.find({
      educatorId: edu._id,
      active: true,
    }).lean();

    if (!availability.length) continue;

    const isAvailable = availability.some((a) =>
      a.daysOfWeek.some((d) => schedule.daysOfWeek.includes(d)) &&
      timeRangesOverlap(
        timeToMinutes(a.startTime),
        timeToMinutes(a.endTime),
        timeToMinutes(schedule.startTime),
        timeToMinutes(schedule.endTime)
      )
    );

    if (!isAvailable) continue;

    const conflict = await hasScheduleConflict({
      Batch,
      educatorId: edu._id,
      newBatch: { schedule, startDate, endDate },
    });

    if (!conflict) {
      return edu;
    }
  }

  throw new Error("No available educator found for this schedule");
}

/**
 * Ensure currentUser can manage a batch (create/update/enroll).
 */
function assertCanManageBatch(currentUser) {
  if (!currentUser || !["admin", "subOrgAdmin", "educator"].includes(currentUser.role)) {
    const err = new Error("Forbidden: not allowed to manage batches");
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Ensure status allows enrollment.
 */
function assertBatchAllowsEnrollment(batch) {
  if (!batch) {
    const err = new Error("Batch not found");
    err.statusCode = 404;
    throw err;
  }

  if (!["published", "ongoing"].includes(batch.status)) {
    const err = new Error(
      "Enrollment is only allowed for 'published' or 'ongoing' batches"
    );
    err.statusCode = 400;
    throw err;
  }

  if (batch.capacity && batch.capacity > 0) {
    if (batch.enrollmentCount >= batch.capacity) {
      const err = new Error("Batch capacity reached");
      err.statusCode = 400;
      throw err;
    }
  }
}

/**
 * Ensure there is no duplicate enrollment for learner in this batch.
 */
async function assertNoDuplicateEnrollment({ Enrollment, batchId, learnerId }) {
  const existing = await Enrollment.findOne({
    batchId,
    learnerId,
    status: { $in: ["pending", "confirmed"] },
  }).lean();

  if (existing) {
    const err = new Error("Learner is already enrolled in this batch");
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Increment enrollmentCount atomically.
 */
async function incrementEnrollmentCount({ Batch, batchId, count }) {
  await Batch.findByIdAndUpdate(
    batchId,
    { $inc: { enrollmentCount: count } },
    { new: false }
  );
}

/* ==================== PUBLIC SERVICE METHODS ==================== */

/**
 * List batches with filters + pagination.
 */
async function listBatches({ Batch, currentUser, query }) {
  const {
    status,
    mode,
    courseId,
    educatorId,
    subOrgId,
    q,
    page = 1,
    limit = 20,
  } = query || {};

  const filter = {};

  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (courseId) filter.courseId = courseId;
  if (educatorId) filter.educatorId = educatorId;
  if (subOrgId) filter.subOrgId = subOrgId;

  // RBAC scoping
  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    filter.subOrgId = currentUser.subOrgId;
  }

  if (currentUser.role === "educator") {
    filter.educatorId = new mongoose.Types.ObjectId(currentUser.userId);
  }

  if (q) {
    filter.name = new RegExp(q, "i");
  }

  const pageNum = Number(page) || 1;
  const limitNum = Math.min(Number(limit) || 20, 100);
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Batch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Batch.countDocuments(filter),
  ]);

  return {
    items: items.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      code: b.code,
      courseId: b.courseId,
      educatorId: b.educatorId,
      subOrgId: b.subOrgId || null,
      mode: b.mode,
      startDate: b.startDate,
      endDate: b.endDate,
      capacity: b.capacity,
      enrollmentCount: b.enrollmentCount,
      status: b.status,
      schedule: b.schedule || null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get single batch with RBAC scope.
 */
async function getBatchById({ Batch, currentUser, batchId }) {
  const batch = await Batch.findById(batchId).lean();

  if (!batch) {
    const err = new Error("Batch not found");
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    if (
      batch.subOrgId &&
      String(batch.subOrgId) !== String(currentUser.subOrgId)
    ) {
      const err = new Error("Forbidden: batch outside your sub-organization");
      err.statusCode = 403;
      throw err;
    }
  }

  if (currentUser.role === "educator") {
    if (String(batch.educatorId) !== String(currentUser.userId)) {
      const err = new Error("Forbidden: batch not assigned to you");
      err.statusCode = 403;
      throw err;
    }
  }

  return {
    id: batch._id.toString(),
    name: batch.name,
    code: batch.code,
    courseId: batch.courseId,
    educatorId: batch.educatorId,
    subOrgId: batch.subOrgId || null,
    mode: batch.mode,
    startDate: batch.startDate,
    endDate: batch.endDate,
    capacity: batch.capacity,
    enrollmentCount: batch.enrollmentCount,
    status: batch.status,
    schedule: batch.schedule || null,
    createdBy: batch.createdBy || null,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

/**
 * Create batch with **auto educator assignment** if educatorId not provided.
 */
async function createBatch({
  Batch,
  OrgUser,
  currentUser,
  data,
}) {
  assertCanManageBatch(currentUser);

  if (!["admin", "subOrgAdmin"].includes(currentUser.role)) {
    const err = new Error("Only admin or subOrgAdmin can create batches");
    err.statusCode = 403;
    throw err;
  }

  const {
    name,
    code,
    courseId,
    educatorId: inputEducatorId,
    subOrgId: inputSubOrgId,
    mode = "online",
    startDate,
    endDate,
    capacity = 0,
    schedule = {},
    status = "draft",
  } = data || {};

  if (!name || !courseId || !startDate || !endDate) {
    const err = new Error("name, courseId, startDate, endDate are required");
    err.statusCode = 400;
    throw err;
  }

  let subOrgId = inputSubOrgId;

  if (currentUser.role === "subOrgAdmin") {
    // force into their subOrg
    subOrgId = currentUser.subOrgId || inputSubOrgId;
  }

  // Validate / resolve educator
  let educatorId = inputEducatorId;

  if (educatorId) {
    const educator = await OrgUser.findOne({
      _id: educatorId,
      role: "educator",
      status: "active",
      verificationStatus: "approved",
    });

    if (!educator) {
      const err = new Error(
        "Educator not found, inactive, or not verified for this tenant"
      );
      err.statusCode = 400;
      throw err;
    }

    if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
      if (
        educator.subOrgId &&
        String(educator.subOrgId) !== String(currentUser.subOrgId)
      ) {
        const err = new Error(
          "Educator not in your sub-organization"
        );
        err.statusCode = 403;
        throw err;
      }
    }

    // schedule conflict check
    const conflict = await hasScheduleConflict({
      Batch,
      educatorId: educator._id,
      newBatch: {
        schedule,
        startDate,
        endDate,
      },
    });

    if (conflict) {
      const err = new Error(
        "Educator already has a conflicting batch for this schedule"
      );
      err.statusCode = 400;
      throw err;
    }
  } else {
    // Auto-pick educator
    const autoEducator = await pickEducatorForBatch({
      OrgUser,
      Batch,
      subOrgId,
      courseId,
      schedule,
      startDate,
      endDate,
    });

    educatorId = autoEducator._id;
  }

  const batch = await Batch.create({
    name,
    code,
    courseId,
    educatorId,
    subOrgId: subOrgId || null,
    mode,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    capacity,
    status,
    schedule: {
      daysOfWeek: schedule.daysOfWeek || [],
      startTime: schedule.startTime || null,
      endTime: schedule.endTime || null,
      timeZone: schedule.timeZone || "Asia/Kolkata",
    },
    createdBy: currentUser.userId ? currentUser.userId : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: batch._id.toString(),
    name: batch.name,
    code: batch.code,
    courseId: batch.courseId,
    educatorId: batch.educatorId,
    subOrgId: batch.subOrgId || null,
    mode: batch.mode,
    startDate: batch.startDate,
    endDate: batch.endDate,
    capacity: batch.capacity,
    enrollmentCount: batch.enrollmentCount,
    status: batch.status,
    schedule: batch.schedule || null,
    createdBy: batch.createdBy || null,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

/**
 * Update batch (change educator, schedule, mode, etc.)
 * Re-runs schedule conflict checks if educator or schedule changes.
 */
async function updateBatch({
  Batch,
  OrgUser,
  currentUser,
  batchId,
  data,
}) {
  assertCanManageBatch(currentUser);

  const batch = await Batch.findById(batchId);
  if (!batch) {
    const err = new Error("Batch not found");
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    if (
      batch.subOrgId &&
      String(batch.subOrgId) !== String(currentUser.subOrgId)
    ) {
      const err = new Error("Forbidden: batch outside your sub-organization");
      err.statusCode = 403;
      throw err;
    }
  }

  if (currentUser.role === "educator") {
    if (String(batch.educatorId) !== String(currentUser.userId)) {
      const err = new Error("Forbidden: batch not assigned to you");
      err.statusCode = 403;
      throw err;
    }
  }

  const {
    educatorId: newEducatorId,
    schedule: newSchedule,
    mode,
    startDate,
    endDate,
    name,
    code,
    capacity,
    subOrgId,
  } = data || {};

  if (name != null) batch.name = name;
  if (code != null) batch.code = code;
  if (capacity != null) batch.capacity = capacity;
  if (mode) batch.mode = mode;

  if (startDate) batch.startDate = new Date(startDate);
  if (endDate) batch.endDate = new Date(endDate);

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId && subOrgId) {
    // optional: allow changing subOrg only inside same sub-org
    if (String(subOrgId) !== String(currentUser.subOrgId)) {
      const err = new Error(
        "SubOrgAdmin cannot move batch to another sub-organization"
      );
      err.statusCode = 403;
      throw err;
    }
  } else if (subOrgId) {
    batch.subOrgId = subOrgId;
  }

  // Possibly update schedule
  if (newSchedule) {
    batch.schedule = {
      ...batch.schedule,
      ...newSchedule,
    };
  }

  // Possibly update educator
  if (newEducatorId) {
    const educator = await OrgUser.findOne({
      _id: newEducatorId,
      role: "educator",
      status: "active",
      verificationStatus: "approved",
    });

    if (!educator) {
      const err = new Error(
        "Educator not found, inactive, or not verified"
      );
      err.statusCode = 400;
      throw err;
    }

    if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
      if (
        educator.subOrgId &&
        String(educator.subOrgId) !== String(currentUser.subOrgId)
      ) {
        const err = new Error(
          "Educator not in your sub-organization"
        );
        err.statusCode = 403;
        throw err;
      }
    }

    const conflict = await hasScheduleConflict({
      Batch,
      educatorId: educator._id,
      newBatch: batch,
    });

    if (conflict) {
      const err = new Error(
        "Educator already has a conflicting batch for this updated schedule"
      );
      err.statusCode = 400;
      throw err;
    }

    batch.educatorId = educator._id;
  }

  batch.updatedAt = new Date();
  await batch.save();

  return {
    id: batch._id.toString(),
    name: batch.name,
    code: batch.code,
    courseId: batch.courseId,
    educatorId: batch.educatorId,
    subOrgId: batch.subOrgId || null,
    mode: batch.mode,
    startDate: batch.startDate,
    endDate: batch.endDate,
    capacity: batch.capacity,
    enrollmentCount: batch.enrollmentCount,
    status: batch.status,
    schedule: batch.schedule || null,
    createdBy: batch.createdBy || null,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

/**
 * Change batch status (draft -> published -> ongoing -> completed / cancelled).
 */
async function changeBatchStatus({ Batch, currentUser, batchId, status }) {
  assertCanManageBatch(currentUser);

  const allowed = [
    "draft",
    "published",
    "ongoing",
    "completed",
    "cancelled",
  ];

  if (!allowed.includes(status)) {
    const err = new Error("Invalid status");
    err.statusCode = 400;
    throw err;
  }

  const batch = await Batch.findById(batchId);
  if (!batch) {
    const err = new Error("Batch not found");
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    if (
      batch.subOrgId &&
      String(batch.subOrgId) !== String(currentUser.subOrgId)
    ) {
      const err = new Error("Forbidden: batch outside your sub-organization");
      err.statusCode = 403;
      throw err;
    }
  }

  if (currentUser.role === "educator") {
    if (String(batch.educatorId) !== String(currentUser.userId)) {
      const err = new Error("Forbidden: batch not assigned to you");
      err.statusCode = 403;
      throw err;
    }
  }

  batch.status = status;
  batch.updatedAt = new Date();
  await batch.save();

  return {
    id: batch._id.toString(),
    status: batch.status,
    updatedAt: batch.updatedAt,
  };
}

/**
 * List enrollments of a batch with pagination.
 */
async function listBatchEnrollments({
  Enrollment,
  currentUser,
  batchId,
  query,
}) {
  const { status, page = 1, limit = 20 } = query || {};

  const filter = { batchId };

  if (status) {
    filter.status = status;
  }

  const pageNum = Number(page) || 1;
  const limitNum = Math.min(Number(limit) || 20, 100);
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Enrollment.find(filter).sort({ enrolledAt: -1 }).skip(skip).limit(limitNum).lean(),
    Enrollment.countDocuments(filter),
  ]);

  return {
    items: items.map((e) => ({
      id: e._id.toString(),
      batchId: e.batchId,
      learnerId: e.learnerId,
      subOrgId: e.subOrgId || null,
      status: e.status,
      source: e.source,
      startDate: e.startDate,
      expiryDate: e.expiryDate,
      notes: e.notes,
      enrolledBy: e.enrolledBy || null,
      enrolledAt: e.enrolledAt,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Admin / SubOrgAdmin / Educator: enroll a single learner into a batch.
 */
async function enrollLearner({
  Batch,
  Enrollment,
  OrgUser,
  currentUser,
  batchId,
  learnerId,
  startDate,
  expiryDate,
  notes,
}) {
  assertCanManageBatch(currentUser);

  const batch = await Batch.findById(batchId);
  assertBatchAllowsEnrollment(batch);

  // RBAC on batch
  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    if (
      batch.subOrgId &&
      String(batch.subOrgId) !== String(currentUser.subOrgId)
    ) {
      const err = new Error("Forbidden: batch outside your sub-organization");
      err.statusCode = 403;
      throw err;
    }
  }

  if (currentUser.role === "educator") {
    if (String(batch.educatorId) !== String(currentUser.userId)) {
      const err = new Error("Forbidden: batch not assigned to you");
      err.statusCode = 403;
      throw err;
    }
  }

  // Validate learner
  const learner = await OrgUser.findOne({
    _id: learnerId,
    role: "learner",
    status: "active",
  }).lean();

  if (!learner) {
    const err = new Error("Learner not found or inactive");
    err.statusCode = 400;
    throw err;
  }

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    if (
      learner.subOrgId &&
      String(learner.subOrgId) !== String(currentUser.subOrgId)
    ) {
      const err = new Error("Learner not in your sub-organization");
      err.statusCode = 403;
      throw err;
    }
  }

  await assertNoDuplicateEnrollment({ Enrollment, batchId, learnerId });

  const enrollment = await Enrollment.create({
    batchId,
    learnerId,
    subOrgId: batch.subOrgId || learner.subOrgId || null,
    status: "confirmed",
    source: "admin",
    startDate: startDate ? new Date(startDate) : batch.startDate || null,
    expiryDate: expiryDate ? new Date(expiryDate) : batch.endDate || null,
    notes: notes || null,
    enrolledBy: currentUser.userId || null,
    enrolledAt: new Date(),
  });

  await incrementEnrollmentCount({ Batch, batchId, count: 1 });

  return {
    id: enrollment._id.toString(),
    batchId: enrollment.batchId,
    learnerId: enrollment.learnerId,
    subOrgId: enrollment.subOrgId || null,
    status: enrollment.status,
    source: enrollment.source,
    startDate: enrollment.startDate,
    expiryDate: enrollment.expiryDate,
    notes: enrollment.notes,
    enrolledBy: enrollment.enrolledBy || null,
    enrolledAt: enrollment.enrolledAt,
  };
}

/**
 * Bulk enroll many learners. Skips duplicates gracefully.
 */
async function bulkEnrollLearners({
  Batch,
  Enrollment,
  OrgUser,
  currentUser,
  batchId,
  learnerIds,
  startDate,
  expiryDate,
  notes,
}) {
  assertCanManageBatch(currentUser);

  if (!Array.isArray(learnerIds) || learnerIds.length === 0) {
    const err = new Error("learnerIds array is required");
    err.statusCode = 400;
    throw err;
  }

  const batch = await Batch.findById(batchId);
  assertBatchAllowsEnrollment(batch);

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    if (
      batch.subOrgId &&
      String(batch.subOrgId) !== String(currentUser.subOrgId)
    ) {
      const err = new Error("Forbidden: batch outside your sub-organization");
      err.statusCode = 403;
      throw err;
    }
  }

  if (currentUser.role === "educator") {
    if (String(batch.educatorId) !== String(currentUser.userId)) {
      const err = new Error("Forbidden: batch not assigned to you");
      err.statusCode = 403;
      throw err;
    }
  }

  const learners = await OrgUser.find({
    _id: { $in: learnerIds },
    role: "learner",
    status: "active",
  }).lean();

  const learnerMap = new Map();
  learners.forEach((l) => learnerMap.set(String(l._id), l));

  const created = [];
  let createdCount = 0;

  for (const lid of learnerIds) {
    const learner = learnerMap.get(String(lid));
    if (!learner) {
      continue;
    }

    if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
      if (
        learner.subOrgId &&
        String(learner.subOrgId) !== String(currentUser.subOrgId)
      ) {
        continue;
      }
    }

    const existing = await Enrollment.findOne({
      batchId,
      learnerId: lid,
      status: { $in: ["pending", "confirmed"] },
    }).lean();

    if (existing) {
      continue;
    }

    if (batch.capacity && batch.capacity > 0) {
      if (batch.enrollmentCount + createdCount >= batch.capacity) {
        break;
      }
    }

    const enrollment = await Enrollment.create({
      batchId,
      learnerId: lid,
      subOrgId: batch.subOrgId || learner.subOrgId || null,
      status: "confirmed",
      source: "admin",
      startDate: startDate ? new Date(startDate) : batch.startDate || null,
      expiryDate: expiryDate ? new Date(expiryDate) : batch.endDate || null,
      notes: notes || null,
      enrolledBy: currentUser.userId || null,
      enrolledAt: new Date(),
    });

    created.push({
      id: enrollment._id.toString(),
      learnerId: enrollment.learnerId,
    });
    createdCount += 1;
  }

  if (createdCount > 0) {
    await incrementEnrollmentCount({ Batch, batchId, count: createdCount });
  }

  return {
    createdCount,
    items: created,
  };
}

/**
 * Learner self-enrollment:
 * POST /api/learner/batches/:id/enroll
 */
async function selfEnrollInBatch({
  Batch,
  Enrollment,
  OrgUser,
  currentUser,
  batchId,
  startDate,
  expiryDate,
  notes,
}) {
  if (!currentUser || currentUser.role !== "learner") {
    const err = new Error("Only learners can self-enroll");
    err.statusCode = 403;
    throw err;
  }

  const learnerId = currentUser.userId;

  const [batch, learner] = await Promise.all([
    Batch.findById(batchId),
    OrgUser.findOne({
      _id: learnerId,
      role: "learner",
      status: "active",
    }).lean(),
  ]);

  assertBatchAllowsEnrollment(batch);

  if (!learner) {
    const err = new Error("Learner not found or inactive");
    err.statusCode = 400;
    throw err;
  }

  await assertNoDuplicateEnrollment({ Enrollment, batchId, learnerId });

  const enrollment = await Enrollment.create({
    batchId,
    learnerId,
    subOrgId: batch.subOrgId || learner.subOrgId || null,
    status: "confirmed", // or "pending" if you want approval flow
    source: "self",
    startDate: startDate ? new Date(startDate) : batch.startDate || null,
    expiryDate: expiryDate ? new Date(expiryDate) : batch.endDate || null,
    notes: notes || null,
    enrolledBy: learnerId,
    enrolledAt: new Date(),
  });

  await incrementEnrollmentCount({ Batch, batchId, count: 1 });

  return {
    id: enrollment._id.toString(),
    batchId: enrollment.batchId,
    learnerId: enrollment.learnerId,
    subOrgId: enrollment.subOrgId || null,
    status: enrollment.status,
    source: enrollment.source,
    startDate: enrollment.startDate,
    expiryDate: enrollment.expiryDate,
    notes: enrollment.notes,
    enrolledBy: enrollment.enrolledBy || null,
    enrolledAt: enrollment.enrolledAt,
  };
}

module.exports = {
  listBatches,
  getBatchById,
  createBatch,
  updateBatch,
  changeBatchStatus,
  listBatchEnrollments,
  enrollLearner,
  bulkEnrollLearners,
  selfEnrollInBatch,
};
