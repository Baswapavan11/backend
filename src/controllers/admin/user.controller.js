// src/controllers/admin/user.controller.js
const userService = require("../../services/admin/user.service");
const mediaService = require("../../services/media.service");


function getCurrentUser(req) {
  return {
    userId: req.user.userId,
    role: req.user.role,
    subOrgId: req.user.subOrgId,
  };
}

async function listUsers(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser, Enrollment } = tenant.models;
    const currentUser = getCurrentUser(req);

    const result = await userService.listUsers({
      OrgUser,
      Enrollment,
      currentUser,
      query: req.query,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/avatar
// multipart/form-data with field: "avatar"
async function uploadUserAvatar(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;

    const currentUser = {
      userId: req.user.userId,
      role: req.user.role,
      subOrgId: req.user.subOrgId,
      dbName: req.user.dbName,
    };

    const { id } = req.params;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Avatar file is required (field name: 'avatar')",
      });
    }

    const user = await OrgUser.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // SubOrgAdmin cannot modify users outside their subOrg
    if (
      currentUser.role === "subOrgAdmin" &&
      currentUser.subOrgId &&
      user.subOrgId &&
      String(user.subOrgId) !== String(currentUser.subOrgId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const tenantKey = currentUser.dbName || "unknown-tenant";

    // Delete previous avatar if any
    if (user.avatarPublicId) {
      await mediaService.deleteUserAvatar(user.avatarPublicId);
    }

    // Upload new avatar
    const uploaded = await mediaService.uploadUserAvatar(
      req.file.buffer,
      tenantKey,
      user._id.toString()
    );

    user.avatarUrl = uploaded.avatarUrl;
    user.avatarPublicId = uploaded.avatarPublicId;
    user.updatedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}


async function getUser(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);

    const result = await userService.getUserById({
      OrgUser,
      currentUser,
      userId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);

    const result = await userService.createUser({
      OrgUser,
      currentUser,
      data: req.body,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);

    const result = await userService.updateUser({
      OrgUser,
      currentUser,
      userId: req.params.id,
      data: req.body,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function changeStatus(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;

    const currentUser = {
      userId: req.user.userId,
      role: req.user.role,
      subOrgId: req.user.subOrgId,
    };

    const result = await userService.changeUserStatus({
      OrgUser,
      userId: req.params.id,
      status: req.body.status,
      currentUser,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}



async function resetPassword(req, res, next) {
  try {
    const tenant = req.tenant;
    const { OrgUser } = tenant.models;
    const currentUser = getCurrentUser(req);
    const { newPassword } = req.body;

    const result = await userService.resetPassword({
      OrgUser,
      currentUser,
      userId: req.params.id,
      newPassword,
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
  listUsers,
  getUser,
  createUser,
  updateUser,
  changeStatus,
  resetPassword,
  uploadUserAvatar,
};
