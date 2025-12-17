// src/controllers/admin/enrollment.controller.js
const enrollmentService = require("../../services/admin/enrollment.service");
const csvService = require("../../services/admin/enrollmentCsv.service");

/* ================= ACCESS CODE ================= */

exports.generateAccessCode = async (req, res, next) => {
  try {
    const { AccessCode } = req.tenant.models;

    const data = await enrollmentService.generateAccessCode({
      AccessCode,
      currentUser: req.user,
      batchId: req.params.batchId,
      maxUses: req.body.maxUses,
      expiresAt: req.body.expiresAt,
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/* ================= CSV UPLOAD ================= */

exports.uploadEnrollmentCsv = async (req, res, next) => {
  try {
    const { Batch, OrgUser, Enrollment } = req.tenant.models;

    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const result = await csvService.processEnrollmentCsv({
      buffer: req.file.buffer,
      batch,
      OrgUser,
      Enrollment,
      currentUser: req.user,
    });

    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/* ================= FINALIZE ================= */

exports.finalizeEnrollment = async (req, res, next) => {
  try {
    const { Enrollment, Batch } = req.tenant.models;

    const data = await enrollmentService.finalizeEnrollment({
      Enrollment,
      Batch,
      currentUser: req.user,
      enrollmentId: req.params.enrollmentId,
    });

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
