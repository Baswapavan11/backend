// src/services/admin/enrollment.service.js
const crypto = require("crypto");

/* ================= ACCESS CODE ================= */

async function generateAccessCode({
  AccessCode,
  currentUser,
  batchId,
  maxUses,
  expiresAt,
}) {
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();

  const accessCode = await AccessCode.create({
    code,
    batchId,
    maxUses: maxUses || 1,
    expiresAt: expiresAt || null,
    usedCount: 0,
    createdBy: currentUser.userId,
    createdAt: new Date(),
  });

  return {
    code: accessCode.code,
    batchId: accessCode.batchId,
    maxUses: accessCode.maxUses,
    expiresAt: accessCode.expiresAt,
  };
}

/* ================= FINALIZE ENROLLMENT ================= */

async function finalizeEnrollment({
  Enrollment,
  Batch,
  currentUser,
  enrollmentId,
}) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    const err = new Error("Enrollment not found");
    err.statusCode = 404;
    throw err;
  }

  if (enrollment.status !== "pending") {
    const err = new Error("Only pending enrollments can be finalized");
    err.statusCode = 400;
    throw err;
  }

  enrollment.status = "confirmed";
  enrollment.enrolledBy = currentUser.userId;
  enrollment.updatedAt = new Date();
  await enrollment.save();

  await Batch.findByIdAndUpdate(enrollment.batchId, {
    $inc: { enrollmentCount: 1 },
  });

  return {
    id: enrollment._id.toString(),
    status: enrollment.status,
  };
}

module.exports = {
  generateAccessCode,
  finalizeEnrollment,
};
