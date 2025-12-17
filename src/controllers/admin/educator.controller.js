const educatorService = require("../../services/admin/educator.service");

/* ================= HELPERS ================= */

function getTenantModels(req) {
  if (!req.tenant || !req.tenant.models) {
    throw new Error("Tenant models not available");
  }
  return req.tenant.models;
}

function getCurrentUser(req) {
  return {
    userId: req.user?.userId,
    role: req.user?.role,
    subOrgId: req.user?.subOrgId,
  };
}

/* ================= CONTROLLERS ================= */

/**
 * GET /api/admin/educators
 */
async function listEducatorsForVerification(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.listEducatorsForVerification({
      OrgUser,
      currentUser: getCurrentUser(req),
      query: req.query,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/educators/:id
 */
async function getEducatorVerificationById(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.getEducatorVerificationById({
      OrgUser,
      educatorId: req.params.id,
      currentUser: getCurrentUser(req),
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/educators/:id/verification-status
 */
async function getVerificationStatusById(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.getVerificationStatusById({
      OrgUser,
      educatorId: req.params.id,
      currentUser: getCurrentUser(req),
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/educators/:id/profile
 */
async function updateEducatorProfile(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.updateEducatorProfile({
      OrgUser,
      educatorId: req.params.id,
      currentUser: getCurrentUser(req),
      payload: req.body,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/educators/:id/documents
 */
async function uploadVerificationDoc(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.uploadVerificationDoc({
      OrgUser,
      educatorId: req.params.id,
      currentUser: getCurrentUser(req),
      file: req.file,
      body: req.body,
      tenantKey: req.tenant.key,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/educators/:id/documents/:docId
 */
async function deleteEducatorDocument(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.deleteEducatorDocument({
      OrgUser,
      educatorId: req.params.id,
      docId: req.params.docId,
      currentUser: getCurrentUser(req),
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/educators/:id/verify
 */
async function updateEducatorVerificationStatus(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.updateEducatorVerificationStatus({
      OrgUser,
      educatorId: req.params.id,
      currentUser: getCurrentUser(req),
      payload: req.body,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/educators/:id/avatar
 */
async function uploadEducatorAvatarController(req, res, next) {
  try {
    const { OrgUser } = getTenantModels(req);

    const data = await educatorService.uploadEducatorAvatar({
      OrgUser,
      educatorId: req.params.id,
      currentUser: getCurrentUser(req),
      file: req.file,
      tenantKey: req.tenant.key,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/* ================= EXPORTS ================= */

module.exports = {
  listEducatorsForVerification,
  getEducatorVerificationById,
  getVerificationStatusById,
  updateEducatorProfile,
  uploadVerificationDoc,
  deleteEducatorDocument,
  updateEducatorVerificationStatus,
  uploadEducatorAvatarController,
};
