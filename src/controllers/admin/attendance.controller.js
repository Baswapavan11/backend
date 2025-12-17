// src/controllers/admin/attendance.controller.js
const attendanceService = require("../../services/admin/attendance.service");

function getTenantModels(req) {
  const tenant = req.tenant;
  if (!tenant || !tenant.models) {
    throw new Error("Tenant models not available");
  }
  return tenant.models;
}

function getCurrentUser(req) {
  return {
    userId: req.user && req.user.userId,
    role: req.user && req.user.role,
    subOrgId: req.user && req.user.subOrgId,
  };
}

// POST /api/admin/attendance/batches/:batchId/sessions/generate
async function generateSessions(req, res, next) {
  try {
    const { Batch, AttendanceSession } = getTenantModels(req);
    const currentUser = getCurrentUser(req);
    const { batchId } = req.params;
    const { regenerate } = req.body || {};

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
      if (
        batch.subOrgId &&
        String(batch.subOrgId) !== String(currentUser.subOrgId)
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: batch outside your sub-organization",
        });
      }
    }

    const result = await attendanceService.generateSessionsForBatch({
      AttendanceSession,
      batch,
      regenerate: regenerate === true || regenerate === "true",
      createdBy: currentUser.userId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/attendance/batches/:batchId/sessions
async function listBatchSessions(req, res, next) {
  try {
    const { AttendanceSession } = getTenantModels(req);
    const { batchId } = req.params;

    const items = await attendanceService.listSessionsForBatch({
      AttendanceSession,
      batchId,
    });

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/attendance/sessions/:sessionId
async function getSession(req, res, next) {
  try {
    const { AttendanceSession, AttendanceRecord } = getTenantModels(req);
    const { sessionId } = req.params;

    const data = await attendanceService.getSessionWithRecords({
      AttendanceSession,
      AttendanceRecord,
      sessionId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/attendance/sessions/:sessionId/auto-online
async function autoOnline(req, res, next) {
  try {
    const { AttendanceSession, AttendanceRecord, Enrollment } = getTenantModels(req);
    const { sessionId } = req.params;
    const { presentLearnerIds } = req.body || {};

    const result = await attendanceService.autoMarkOnlineSession({
      AttendanceSession,
      AttendanceRecord,
      Enrollment,
      sessionId,
      presentLearnerIds,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateSessions,
  listBatchSessions,
  getSession,
  autoOnline,
};
