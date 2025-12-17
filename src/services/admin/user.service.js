// src/services/admin/user.service.js
const bcrypt = require("bcryptjs");

/**
 * List users with filters (role, status, search, pagination)
 */
async function listUsers({ OrgUser, Enrollment, currentUser, query }) {
  const {
    role,
    status,
    q,
    page = 1,
    limit = 20,
    unassignedOnly,
  } = query || {};

  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (status) {
    filter.status = status;
  }

  // SubOrgAdmin can only see users in their subOrg
  if (currentUser && currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    filter.subOrgId = currentUser.subOrgId;
  }

  if (q) {
    const regex = new RegExp(q, "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  // 🔹 If unassignedOnly=true and we are listing learners,
  // exclude learners who have ANY active enrollment in ANY batch
  if (
    (unassignedOnly === "true" || unassignedOnly === "1") &&
    role === "learner" &&
    Enrollment
  ) {
    const activeEnrollments = await Enrollment.find({
      status: { $in: ["pending", "confirmed"] },
    })
      .select("learnerId")
      .lean();

    const learnerIdsWithBatch = activeEnrollments.map((e) =>
      e && e.learnerId ? String(e.learnerId) : null
    ).filter(Boolean);

    if (learnerIdsWithBatch.length > 0) {
      filter._id = { $nin: learnerIdsWithBatch };
    }
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Fetch users and populate subOrg name where possible
  const [itemsRaw, total] = await Promise.all([
    OrgUser.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({ path: "subOrgId", select: "name" })
      .lean(),
    OrgUser.countDocuments(filter),
  ]);

  // Defensive mapping to avoid calling .toString() on undefined
  const items = (itemsRaw || []).map((u) => {
    // id fallback
    const id = u && (u._id ? String(u._id) : (u.id ? String(u.id) : null));

    // subOrg may be populated object or raw id or null
    let subOrgIdVal = null;
    let subOrgNameVal = null;

    if (u && u.subOrgId) {
      if (typeof u.subOrgId === "object") {
        subOrgIdVal = u.subOrgId._id ? String(u.subOrgId._id) : (u.subOrgId.id ? String(u.subOrgId.id) : null);
        subOrgNameVal = u.subOrgId.name || (u.subOrgName || null);
      } else {
        subOrgIdVal = String(u.subOrgId);
        subOrgNameVal = u.subOrgName || null;
      }
    } else {
      subOrgIdVal = u && u.subOrgId ? String(u.subOrgId) : (u ? (u.subOrgId || null) : null);
      subOrgNameVal = u ? (u.subOrgName || null) : null;
    }

    return {
      id,
      name: u && u.name ? u.name : "",
      email: u && u.email ? u.email : null,
      phone: u && u.phone ? u.phone : null,
      role: u && u.role ? u.role : null,
      status: u && u.status ? u.status : null,
      subOrgId: subOrgIdVal,
      subOrgName: subOrgNameVal,
      lastLoginAt: u && u.lastLoginAt ? u.lastLoginAt : null,
      createdAt: u && u.createdAt ? u.createdAt : null,
      avatarUrl: u && u.avatarUrl ? u.avatarUrl : null,

      // expose automation flags for UI if needed
      autoEnrollEnabled: (u && typeof u.autoEnrollEnabled !== "undefined") ? u.autoEnrollEnabled : false,
      defaultTrack: u && u.defaultTrack ? u.defaultTrack : "",
    };
  });

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get single user by ID with access control.
 */
async function getUserById({ OrgUser, currentUser, userId }) {
  const user = await OrgUser.findById(userId).lean();

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // SubOrgAdmin cannot see users outside their subOrg
  if (
    currentUser &&
    currentUser.role === "subOrgAdmin" &&
    currentUser.subOrgId &&
    user.subOrgId &&
    String(user.subOrgId) !== String(currentUser.subOrgId)
  ) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  return {
    id: user._id ? String(user._id) : null,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    subOrgId: user.subOrgId || null,
    subOrgName: user.subOrgName || null,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || null,
    autoEnrollEnabled: user.autoEnrollEnabled ?? false,
    defaultTrack: user.defaultTrack || "",
    metadata: user.metadata || {},
  };
}

/**
 * Create a new user (Admin / SubOrgAdmin)
 */
async function createUser({ OrgUser, currentUser, data }) {
  const {
    name,
    email,
    phone,
    role,
    subOrgId,
    password, // optional: if not given, we can auto-generate later
    // automation-related (primarily for learners)
    autoEnrollEnabled,
    defaultTrack,
    metadata,
  } = data || {};

  if (!name || !role) {
    const err = new Error("name and role are required");
    err.statusCode = 400;
    throw err;
  }

  // Role access rules
  if (currentUser && currentUser.role === "subOrgAdmin") {
    // SubOrgAdmin cannot create tenant admins
    if (role === "admin" || role === "subOrgAdmin") {
      const err = new Error("SubOrg admin cannot create admin roles");
      err.statusCode = 403;
      throw err;
    }
  }

  // Email uniqueness per tenant (simple check)
  if (email) {
    const existing = await OrgUser.findOne({ email }).lean();
    if (existing) {
      const err = new Error("Email already in use");
      err.statusCode = 409;
      throw err;
    }
  }

  let passwordHash = null;

  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  const now = new Date();

  // Determine final subOrgId (existing logic)
  const finalSubOrgId =
    currentUser && currentUser.role === "subOrgAdmin"
      ? currentUser.subOrgId || null
      : subOrgId || null;

  // Resolve subOrgName from tenant SubOrg model (if available)
  let subOrgNameValue = null;
  if (finalSubOrgId) {
    try {
      // use OrgUser.db.model to get the model on the same connection
      const SubOrg = OrgUser.db.model("SubOrg");
      const subOrg = await SubOrg.findById(finalSubOrgId).lean();
      if (subOrg) subOrgNameValue = subOrg.name;
    } catch (e) {
      console.warn("Could not resolve subOrgName:", e.message);
      subOrgNameValue = null;
    }
  }

  const userDoc = await OrgUser.create({
    name,
    email: email || null,
    phone: phone || null,
    role,
    status: "inactive",
    subOrgId: finalSubOrgId,
    subOrgName: subOrgNameValue,
    passwordHash,
    createdBy: currentUser ? currentUser.userId || null : null,
    createdAt: now,
    updatedAt: now,

    // Automation flags (safe defaults if undefined)
    autoEnrollEnabled:
      typeof autoEnrollEnabled === "boolean" ? autoEnrollEnabled : false,
    defaultTrack: defaultTrack || "",
    metadata: metadata || {},
  });

  return {
    id: userDoc._id ? String(userDoc._id) : null,
    name: userDoc.name,
    email: userDoc.email,
    phone: userDoc.phone,
    role: userDoc.role,
    status: userDoc.status,
    subOrgId: userDoc.subOrgId || null,
    subOrgName: userDoc.subOrgName || null,
    avatarUrl: userDoc.avatarUrl || null,
    autoEnrollEnabled: userDoc.autoEnrollEnabled ?? false,
    defaultTrack: userDoc.defaultTrack || "",
  };
}

/**
 * Update user basic details (name, phone, role, subOrg)
 * (not password here)
 */
async function updateUser({ OrgUser, currentUser, userId, data }) {
  const user = await OrgUser.findById(userId);

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // SubOrgAdmin cannot modify users outside their subOrg
  if (
    currentUser &&
    currentUser.role === "subOrgAdmin" &&
    currentUser.subOrgId &&
    user.subOrgId &&
    String(user.subOrgId) !== String(currentUser.subOrgId)
  ) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  // SubOrgAdmin cannot upgrade role to admin/subOrgAdmin
  if (currentUser && currentUser.role === "subOrgAdmin" && data && data.role) {
    if (["admin", "subOrgAdmin"].includes(data.role)) {
      const err = new Error("SubOrg admin cannot assign admin roles");
      err.statusCode = 403;
      throw err;
    }
  }

  if (data && data.name !== undefined) user.name = data.name;
  if (data && data.phone !== undefined) user.phone = data.phone;
  if (data && data.role !== undefined) user.role = data.role;

  if (currentUser && currentUser.role === "admin" && data && data.subOrgId !== undefined) {
    user.subOrgId = data.subOrgId || null;

    // Resolve and set subOrgName when admin changes subOrgId
    if (user.subOrgId) {
      try {
        const SubOrg = user.constructor.db.model("SubOrg");
        const subOrg = await SubOrg.findById(user.subOrgId).lean();
        user.subOrgName = subOrg ? subOrg.name : null;
      } catch (e) {
        console.warn("Could not resolve subOrgName on update:", e.message);
        user.subOrgName = null;
      }
    } else {
      user.subOrgName = null;
    }
  }

  // Automation flags can be updated by admin
  if (data && data.autoEnrollEnabled !== undefined) {
    user.autoEnrollEnabled = !!data.autoEnrollEnabled;
  }
  if (data && data.defaultTrack !== undefined) {
    user.defaultTrack = data.defaultTrack || "";
  }
  if (data && data.metadata !== undefined && typeof data.metadata === "object") {
    user.metadata = data.metadata;
  }

  user.updatedAt = new Date();
  await user.save();

  return {
    id: user._id ? String(user._id) : null,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    subOrgId: user.subOrgId || null,
    subOrgName: user.subOrgName || null,
    autoEnrollEnabled: user.autoEnrollEnabled ?? false,
    avatarUrl: user.avatarUrl || null,
    defaultTrack: user.defaultTrack || "",
    metadata: user.metadata || {},
  };
}

/**
 * Change user status (active/inactive/blocked)
 */
async function changeUserStatus({ OrgUser, userId, status, currentUser }) {
  const allowedStatuses = ["active", "inactive", "blocked"];

  if (!allowedStatuses.includes(status)) {
    const err = new Error("Invalid status. Allowed: active, inactive, blocked");
    err.statusCode = 400;
    throw err;
  }

  const user = await OrgUser.findById(userId);

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Optional: prevent admin from blocking themselves
  if (
    currentUser &&
    currentUser.userId &&
    String(currentUser.userId) === String(user._id) &&
    status === "blocked"
  ) {
    const err = new Error("You cannot block your own account");
    err.statusCode = 400;
    throw err;
  }

  user.status = status;
  user.updatedAt = new Date();

  await user.save();

  return {
    id: user._id ? String(user._id) : null,
    status: user.status,
  };
}

/**
 * Reset user password
 */
async function resetPassword({ OrgUser, currentUser, userId, newPassword }) {
  if (!newPassword) {
    const err = new Error("newPassword is required");
    err.statusCode = 400;
    throw err;
  }

  const user = await OrgUser.findById(userId);

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // SubOrgAdmin cannot modify users outside their subOrg
  if (
    currentUser &&
    currentUser.role === "subOrgAdmin" &&
    currentUser.subOrgId &&
    user.subOrgId &&
    String(user.subOrgId) !== String(currentUser.subOrgId)
  ) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  const hash = await bcrypt.hash(newPassword, 10);

  user.passwordHash = hash;
  user.updatedAt = new Date();
  await user.save();

  return {
    id: user._id ? String(user._id) : null,
    avatarUrl: user.avatarUrl || null,
    message: "Password reset successfully",
  };
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserStatus,
  resetPassword,
};
