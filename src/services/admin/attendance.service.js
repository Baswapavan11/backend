// src/services/admin/attendance.service.js
const crypto = require("crypto");

/**
 * Generate sessions for a batch based on its schedule.
 * This is idempotent if regenerate=false (it will skip conflicts).
 */
async function generateSessionsForBatch({
  AttendanceSession,
  batch,
  regenerate = false,
  createdBy,
}) {
  if (!batch.schedule || !batch.schedule.daysOfWeek || !batch.startDate || !batch.endDate) {
    return { created: 0 };
  }

  const daysOfWeek = batch.schedule.daysOfWeek; // ["Mon", "Wed", ...]
  const start = new Date(batch.startDate);
  const end = new Date(batch.endDate);

  if (regenerate) {
    await AttendanceSession.deleteMany({ batchId: batch._id });
  }

  let created = 0;

  const mapDay = {
    0: "Sun",
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
  };

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayCode = mapDay[d.getDay()];
    if (!daysOfWeek.includes(dayCode)) continue;

    const sessionDate = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    );

    const payload = {
      batchId: batch._id,
      date: sessionDate,
      mode: batch.mode,
      startTime: batch.schedule.startTime || null,
      endTime: batch.schedule.endTime || null,
      timeZone: batch.schedule.timeZone || "Asia/Kolkata",
      autoOnline: batch.mode === "online",
      qrEnabled: batch.mode !== "online",
      createdBy: createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (payload.qrEnabled) {
      payload.qrCodeToken = crypto.randomBytes(24).toString("hex");
    }

    try {
      await AttendanceSession.create(payload);
      created += 1;
    } catch (err) {
      if (err.code === 11000) {
        // duplicate -> ignore
        continue;
      } else {
        throw err;
      }
    }
  }

  return { created };
}

/**
 * List sessions for a batch.
 */
async function listSessionsForBatch({ AttendanceSession, batchId }) {
  const items = await AttendanceSession.find({ batchId })
    .sort({ date: 1, startTime: 1 })
    .lean();

  return items.map((s) => ({
    id: s._id.toString(),
    batchId: s.batchId,
    date: s.date,
    mode: s.mode,
    startTime: s.startTime,
    endTime: s.endTime,
    timeZone: s.timeZone,
    qrEnabled: s.qrEnabled,
    autoOnline: s.autoOnline,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * Get single session with attendance summary.
 */
async function getSessionWithRecords({
  AttendanceSession,
  AttendanceRecord,
  sessionId,
}) {
  const session = await AttendanceSession.findById(sessionId).lean();
  if (!session) {
    const err = new Error("Attendance session not found");
    err.statusCode = 404;
    throw err;
  }

  const records = await AttendanceRecord.find({ sessionId }).lean();

  return {
    session: {
      id: session._id.toString(),
      batchId: session.batchId,
      date: session.date,
      mode: session.mode,
      startTime: session.startTime,
      endTime: session.endTime,
      timeZone: session.timeZone,
      qrEnabled: session.qrEnabled,
      autoOnline: session.autoOnline,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    attendance: records.map((r) => ({
      id: r._id.toString(),
      learnerId: r.learnerId,
      batchId: r.batchId,
      enrollmentId: r.enrollmentId || null,
      status: r.status,
      source: r.source,
      checkedInAt: r.checkedInAt,
    })),
  };
}

/**
 * Learner QR scan: resolve token -> session -> mark present.
 */
async function markAttendanceByQr({
  AttendanceSession,
  AttendanceRecord,
  Enrollment,
  currentUser,
  token,
}) {
  if (!currentUser || currentUser.role !== "learner") {
    const err = new Error("Only learners can scan attendance QR");
    err.statusCode = 403;
    throw err;
  }

  const learnerId = currentUser.userId;

  const session = await AttendanceSession.findOne({
    qrCodeToken: token,
    qrEnabled: true,
  }).lean();

  if (!session) {
    const err = new Error("Invalid or expired QR code");
    err.statusCode = 400;
    throw err;
  }

  const enrollment = await Enrollment.findOne({
    batchId: session.batchId,
    learnerId,
    status: { $in: ["pending", "confirmed", "completed"] },
  }).lean();

  if (!enrollment) {
    const err = new Error("You are not enrolled in this batch");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();

  const update = {
    sessionId: session._id,
    batchId: session.batchId,
    enrollmentId: enrollment._id,
    learnerId,
    status: "present",
    source: "qr",
    checkedInAt: now,
    updatedAt: now,
  };

  const record = await AttendanceRecord.findOneAndUpdate(
    {
      sessionId: session._id,
      learnerId,
    },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    id: record._id.toString(),
    sessionId: record.sessionId,
    batchId: record.batchId,
    learnerId: record.learnerId,
    status: record.status,
    source: record.source,
    checkedInAt: record.checkedInAt,
  };
}

/**
 * Auto mark attendance for online sessions.
 * presentLearnerIds (optional) – if provided, only those are marked present.
 * If not provided, marks all confirmed enrollments as present.
 */
async function autoMarkOnlineSession({
  AttendanceSession,
  AttendanceRecord,
  Enrollment,
  sessionId,
  presentLearnerIds,
}) {
  const session = await AttendanceSession.findById(sessionId);
  if (!session) {
    const err = new Error("Attendance session not found");
    err.statusCode = 404;
    throw err;
  }

  if (session.mode !== "online") {
    const err = new Error("Auto online attendance only for online sessions");
    err.statusCode = 400;
    throw err;
  }

  const enrollments = await Enrollment.find({
    batchId: session.batchId,
    status: { $in: ["pending", "confirmed", "completed"] },
  }).lean();

  const presentSet = new Set(
    (presentLearnerIds || []).map((id) => String(id))
  );

  const now = new Date();
  let updatedCount = 0;

  for (const enr of enrollments) {
    const learnerId = enr.learnerId;
    const isPresent =
      presentSet.size === 0 || presentSet.has(String(learnerId));

    if (!isPresent) continue;

    const update = {
      sessionId: session._id,
      batchId: session.batchId,
      enrollmentId: enr._id,
      learnerId,
      status: "present",
      source: "online-auto",
      checkedInAt: now,
      updatedAt: now,
    };

    await AttendanceRecord.findOneAndUpdate(
      {
        sessionId: session._id,
        learnerId,
      },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    updatedCount += 1;
  }

  session.status = "closed";
  session.updatedAt = new Date();
  await session.save();

  return { updatedCount };
}

module.exports = {
  generateSessionsForBatch,
  listSessionsForBatch,
  getSessionWithRecords,
  markAttendanceByQr,
  autoMarkOnlineSession,
};
