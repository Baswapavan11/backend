// src/services/media.service.js
const cloudinary = require("../config/cloudinary");

/**
 * Helper: upload a raw buffer to Cloudinary using upload_stream.
 */
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        ...options,
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );

    stream.end(buffer);
  });
}

/**
 * 🔹 Generic upload used by controllers as mediaService.uploadFile(...)
 *    This is what was missing and causing:
 *    "mediaService.uploadFile is not a function"
 *
 *  - buffer: file buffer from multer (req.file.buffer)
 *  - options: { folder, ... } passed from controller
 *
 *  Returns a normalized object with:
 *    { url, publicId, mimeType }
 */
async function uploadFile(buffer, options = {}) {
  if (!buffer) {
    throw new Error("uploadFile: buffer is required");
  }

  const result = await uploadBufferToCloudinary(buffer, options);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    mimeType: result.resource_type || null,
  };
}

/**
 * Org logo upload
 * folder: lms/{orgSlug}/branding
 */
async function uploadOrgLogo(buffer, orgSlug) {
  const folder = `lms/${orgSlug}/branding`;

  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    use_filename: true,
    unique_filename: true,
    overwrite: true,
  });

  return {
    logoUrl: result.secure_url,
    logoPublicId: result.public_id,
  };
}

/**
 * Org favicon upload
 * folder: lms/{orgSlug}/branding
 */
async function uploadOrgFavicon(buffer, orgSlug) {
  const folder = `lms/${orgSlug}/branding`;

  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    use_filename: true,
    unique_filename: true,
    overwrite: true,
  });

  return {
    faviconUrl: result.secure_url,
    faviconPublicId: result.public_id,
  };
}

/**
 * Educator verification doc upload
 * folder: lms/{orgSlug}/educators/{educatorId}
 *
 * NOTE:
 * - Some controllers might still call uploadEducatorDoc(...)
 * - Others may call the new generic uploadFile(...)
 * - Both are supported.
 */
async function uploadEducatorDoc(buffer, orgSlug, educatorId) {
  const folder = `lms/${orgSlug}/educators/${educatorId}`;

  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    use_filename: true,
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

async function deleteEducatorDoc(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (err) {
    console.warn("[mediaService] Failed to delete educator doc:", err.message);
  }
}

/**
 * Lesson asset upload (PDF, video, etc.)
 * folder: lms/{tenantKey}/lessons/{lessonId}
 */
async function uploadLessonAsset(buffer, tenantKey, lessonId) {
  const folder = `lms/${tenantKey}/lessons/${lessonId}`;

  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    use_filename: true,
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

/**
 * User avatar upload (for any OrgUser role)
 * folder: lms/{tenantKey}/avatars/{userId}
 */
async function uploadUserAvatar(buffer, tenantKey, userId) {
  const folder = `lms/${tenantKey}/avatars/${userId}`;

  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    use_filename: true,
    unique_filename: true,
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face" },
    ],
  });

  return {
    avatarUrl: result.secure_url,
    avatarPublicId: result.public_id,
  };
}

/**
 * Delete user avatar by publicId
 */
async function deleteUserAvatar(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (err) {
    console.warn("[mediaService] Failed to delete user avatar:", err.message);
  }
}

module.exports = {
  // 🔹 New generic uploader used by educator docs controller
  uploadFile,

  // Existing helpers (unchanged)
  uploadOrgLogo,
  uploadOrgFavicon,
  uploadEducatorDoc,
  deleteEducatorDoc,
  uploadLessonAsset,
  uploadUserAvatar,
  deleteUserAvatar,
};
