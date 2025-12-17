// src/controllers/admin/suborg.controller.js
const subOrgService = require("../../services/admin/suborg.service");

function getCurrentUser(req) {
  return {
    userId: req.user.userId,
    role: req.user.role,
    subOrgId: req.user.subOrgId,
  };
}

async function listSubOrgs(req, res, next) {
  try {
    const tenant = req.tenant;
    const { SubOrg, OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);

    const data = await subOrgService.listSubOrgs({
      SubOrg,
      currentUser,
      OrgUser,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getSubOrg(req, res, next) {
  try {
    const tenant = req.tenant;
    const { SubOrg } = tenant.models;
    const currentUser = getCurrentUser(req);

    const data = await subOrgService.getSubOrg({
      SubOrg,
      currentUser,
      id: req.params.id,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function createSubOrg(req, res, next) {
  try {
    const tenant = req.tenant;
    const { SubOrg } = tenant.models;
    const currentUser = getCurrentUser(req);

    const data = await subOrgService.createSubOrg({
      SubOrg,
      currentUser,
      data: req.body,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function createSubOrgWithAdmin(req, res, next) {
  try {
    const tenant = req.tenant;
    const { SubOrg, OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);

    const data = await subOrgService.createSubOrgWithAdmin({
      SubOrg,
      OrgUser,
      currentUser,
      data: req.body,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSubOrg(req, res, next) {
  try {
    const tenant = req.tenant;
    const { SubOrg } = tenant.models;
    const currentUser = getCurrentUser(req);

    const data = await subOrgService.updateSubOrg({
      SubOrg,
      currentUser,
      id: req.params.id,
      data: req.body,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function changeSubOrgStatus(req, res, next) {
  try {
    const tenant = req.tenant;
    const { SubOrg } = tenant.models;
    const currentUser = getCurrentUser(req);
    const { status } = req.body;

    const data = await subOrgService.changeSubOrgStatus({
      SubOrg,
      currentUser,
      id: req.params.id,
      status,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function transferUserSubOrg(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);
    const { subOrgId } = req.body;

    const data = await subOrgService.transferUserSubOrg({
      OrgUser,
      currentUser,
      userId: req.params.userId,
      subOrgId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSubOrgs,
  getSubOrg,
  createSubOrg,
  createSubOrgWithAdmin,
  updateSubOrg,
  changeSubOrgStatus,
  transferUserSubOrg,
};
