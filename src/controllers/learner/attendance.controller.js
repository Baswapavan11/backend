// src/controllers/learner/attendance.controller.js
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

// POST /api/learner/attendance/scan
async function scanQr(req, res, next) {
  try {
    const { AttendanceSession, AttendanceRecord, Enrollment } = getTenantModels(req);
    const currentUser = getCurrentUser(req);
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "QR token is required",
      });
    }

    const result = await attendanceService.markAttendanceByQr({
      AttendanceSession,
      AttendanceRecord,
      Enrollment,
      currentUser,
      token,
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
  scanQr,
};
