const mediaService = require("../media.service");

/* ================= LIST ================= */

async function listEducatorsForVerification({ OrgUser, currentUser, query }) {
  const { status, q, page = 1, limit = 20 } = query;

  const filter = { role: "educator" };

  if (status) filter.verificationStatus = status;

  if (q) {
    const regex = new RegExp(q, "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  if (currentUser.role === "subOrgAdmin" && currentUser.subOrgId) {
    filter.subOrgId = currentUser.subOrgId;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    OrgUser.find(filter).skip(skip).limit(Number(limit)).lean(),
    OrgUser.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      status: u.verificationStatus || "unverified",
      userStatus: u.status,
      docsCount: u.verificationDocs?.length || 0,
    })),
    pagination: { page: Number(page), limit: Number(limit), total },
  };
}

/* ================= DETAILS ================= */

async function getEducatorVerificationById({ OrgUser, educatorId, currentUser }) {
  const educator = await OrgUser.findOne({
    _id: educatorId,
    role: "educator",
  }).lean();

  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  if (
    currentUser.role === "educator" &&
    String(currentUser.userId) !== String(educatorId)
  ) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return educator;
}

async function getVerificationStatusById({ OrgUser, educatorId }) {
  const educator = await OrgUser.findById(educatorId).lean();
  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  return {
    educatorId,
    status: educator.verificationStatus || "unverified",
    documents: educator.verificationDocs || [],
  };
}

/* ================= PROFILE (FIXED) ================= */

async function updateEducatorProfile({ OrgUser, educatorId, currentUser, payload }) {
  if (
    currentUser.role === "educator" &&
    String(currentUser.userId) !== String(educatorId)
  ) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  const educator = await OrgUser.findById(educatorId);
  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  // ✅ SUPPORT BOTH PAYLOAD TYPES
  const profilePayload = payload.educatorProfile
    ? payload.educatorProfile
    : payload;

  educator.educatorProfile = {
    ...educator.educatorProfile,
    ...profilePayload,
  };

  educator.updatedAt = new Date();
  await educator.save();

  return {
    id: educator._id.toString(),
    educatorProfile: educator.educatorProfile,
  };
}

/* ================= DOCUMENTS ================= */

async function uploadVerificationDoc({
  OrgUser,
  educatorId,
  currentUser,
  file,
  body,
  tenantKey,
}) {
  if (!file?.buffer) throw Object.assign(new Error("File required"), { statusCode: 400 });
  if (!["admin", "subOrgAdmin"].includes(currentUser.role))
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  const educator = await OrgUser.findById(educatorId);
  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  const uploaded = await mediaService.uploadFile(file.buffer, {
    folder: `lms/${tenantKey}/educators/${educatorId}`,
    resource_type: "raw",
  });

  educator.verificationDocs.push({
    type: body.type || "other",
    title: body.title || "",
    description: body.description || "",
    url: uploaded.url,
    publicId: uploaded.publicId,
    mimeType: uploaded.mimeType,
    uploadedAt: new Date(),
  });

  educator.verificationStatus = "pending";
  educator.updatedAt = new Date();
  await educator.save();

  return educator.verificationDocs.at(-1);
}

async function deleteEducatorDocument({ OrgUser, educatorId, docId }) {
  const educator = await OrgUser.findById(educatorId);
  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  const doc = educator.verificationDocs.id(docId);
  if (!doc) throw Object.assign(new Error("Document not found"), { statusCode: 404 });

  if (doc.publicId) await mediaService.deleteEducatorDoc(doc.publicId);

  doc.remove();
  educator.updatedAt = new Date();
  await educator.save();

  return { deleted: true };
}

/* ================= VERIFY ================= */

async function updateEducatorVerificationStatus({ OrgUser, educatorId, currentUser, payload }) {
  if (!["admin", "subOrgAdmin"].includes(currentUser.role))
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  const educator = await OrgUser.findById(educatorId);
  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  educator.verificationStatus = payload.status;
  educator.verifiedBy = currentUser.userId;
  educator.verifiedAt = new Date();
  educator.updatedAt = new Date();

  await educator.save();

  return { id: educatorId, status: educator.verificationStatus };
}

/* ================= AVATAR ================= */

async function uploadEducatorAvatar({ OrgUser, educatorId, currentUser, file, tenantKey }) {
  if (!file?.buffer) throw Object.assign(new Error("Avatar required"), { statusCode: 400 });
  if (!["admin", "subOrgAdmin"].includes(currentUser.role))
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

  const educator = await OrgUser.findById(educatorId);
  if (!educator) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });

  const uploaded = await mediaService.uploadUserAvatar(
    file.buffer,
    tenantKey,
    educatorId
  );

  educator.avatarUrl = uploaded.avatarUrl;
  educator.avatarPublicId = uploaded.avatarPublicId;
  educator.updatedAt = new Date();
  await educator.save();

  return { avatarUrl: educator.avatarUrl };
}

module.exports = {
  listEducatorsForVerification,
  getEducatorVerificationById,
  getVerificationStatusById,
  updateEducatorProfile,
  uploadVerificationDoc,
  deleteEducatorDocument,
  updateEducatorVerificationStatus,
  uploadEducatorAvatar,
};
