// src/controllers/admin/batch.controller.js
const batchService = require("../../services/admin/batch.service");

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

async function listBatches(req, res, next) {
  try {
    const { Batch } = getTenantModels(req);
    const currentUser = getCurrentUser(req);

    const result = await batchService.listBatches({
      Batch,
      currentUser,
      query: req.query,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getBatch(req, res, next) {
  try {
    const { Batch } = getTenantModels(req);
    const currentUser = getCurrentUser(req);

    const result = await batchService.getBatchById({
      Batch,
      currentUser,
      batchId: req.params.id,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createBatch(req, res, next) {
  try {
   //const { Batch, OrgUser } = getTenantModels(req);
   const { Batch, OrgUser, EducatorAvailability } = getTenantModels(req);//new

    const currentUser = getCurrentUser(req);

    const result = await batchService.createBatch({
      Batch,
      OrgUser,
      EducatorAvailability,//new
      currentUser,
      data: req.body,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function updateBatch(req, res, next) {
  try {
    //const { Batch, OrgUser } = getTenantModels(req);
    const { Batch, OrgUser, EducatorAvailability } = getTenantModels(req);//new

    const currentUser = getCurrentUser(req);

    const result = await batchService.updateBatch({
      Batch,
      OrgUser,
      EducatorAvailability,//new
      currentUser,
      batchId: req.params.id,
      data: req.body,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function changeBatchStatus(req, res, next) {
  try {
    const { Batch } = getTenantModels(req);
    const currentUser = getCurrentUser(req);
    const { status } = req.body;

    const result = await batchService.changeBatchStatus({
      Batch,
      currentUser,
      batchId: req.params.id,
      status,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listBatchEnrollments(req, res, next) {
  try {
    const { Enrollment } = getTenantModels(req);
    const currentUser = getCurrentUser(req);

    const result = await batchService.listBatchEnrollments({
      Enrollment,
      currentUser,
      batchId: req.params.id,
      query: req.query,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function enrollLearner(req, res, next) {
  try {
    const { Batch, Enrollment, OrgUser } = getTenantModels(req);
    const currentUser = getCurrentUser(req);
    const { learnerId, startDate, expiryDate, notes } = req.body;

    const result = await batchService.enrollLearner({
      Batch,
      Enrollment,
      OrgUser,
      currentUser,
      batchId: req.params.id,
      learnerId,
      startDate,
      expiryDate,
      notes,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function bulkEnrollLearners(req, res, next) {
  try {
    const { Batch, Enrollment, OrgUser } = getTenantModels(req);
    const currentUser = getCurrentUser(req);
    const { learnerIds, startDate, expiryDate, notes } = req.body;

    const result = await batchService.bulkEnrollLearners({
      Batch,
      Enrollment,
      OrgUser,
      currentUser,
      batchId: req.params.id,
      learnerIds,
      startDate,
      expiryDate,
      notes,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 🔹 Learner self-enrollment
async function selfEnroll(req, res, next) {
  try {
    const { Batch, Enrollment, OrgUser } = getTenantModels(req);
    const currentUser = getCurrentUser(req);
    const { startDate, expiryDate, notes } = req.body || {};

    const result = await batchService.selfEnrollInBatch({
      Batch,
      Enrollment,
      OrgUser,
      currentUser,
      batchId: req.params.id,
      startDate,
      expiryDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBatches,
  getBatch,
  createBatch,
  updateBatch,
  changeBatchStatus,
  listBatchEnrollments,
  enrollLearner,
  bulkEnrollLearners,
  selfEnroll,
};
