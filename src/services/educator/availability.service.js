async function createAvailability({ EducatorAvailability, currentUser, data }) {
  const { daysOfWeek, startTime, endTime } = data;

  if (!daysOfWeek || !startTime || !endTime) {
    const err = new Error("daysOfWeek, startTime, endTime are required");
    err.statusCode = 400;
    throw err;
  }

  return EducatorAvailability.create({
    educatorId: currentUser.userId,
    subOrgId: currentUser.subOrgId || null,
    daysOfWeek,
    startTime,
    endTime,
  });
}

async function listAvailability({ EducatorAvailability, educatorId }) {
  return EducatorAvailability.find({
    educatorId,
    active: true,
  }).lean();
}

async function updateAvailability({
  EducatorAvailability,
  educatorId,
  id,
  data,
}) {
  const slot = await EducatorAvailability.findOne({
    _id: id,
    educatorId,
  });

  if (!slot) {
    const err = new Error("Availability not found");
    err.statusCode = 404;
    throw err;
  }

  Object.assign(slot, data, { updatedAt: new Date() });
  await slot.save();
  return slot;
}

async function deleteAvailability({ EducatorAvailability, educatorId, id }) {
  await EducatorAvailability.deleteOne({
    _id: id,
    educatorId,
  });
}

module.exports = {
  createAvailability,
  listAvailability,
  updateAvailability,
  deleteAvailability,
};
