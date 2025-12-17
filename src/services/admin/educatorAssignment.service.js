async function findEligibleEducators({
  OrgUser,
  courseId,
  schedule,
}) {
  return OrgUser.find({
    role: "educator",
    status: "active",
    verificationStatus: "approved",
    "educatorProfile.teachesCourses": courseId,
    "educatorProfile.availableSlots": {
      $elemMatch: {
        day: { $in: schedule.days.map(d => d.toLowerCase()) },
        start: { $lte: schedule.startTime },
        end: { $gte: schedule.endTime },
      },
    },
  }).lean();
}

async function pickEducatorByStrategy({
  educators,
  strategy,
  Batch,
}) {
  if (!educators.length) return null;

  switch (strategy) {
    case "least_batches": {
      const counts = await Promise.all(
        educators.map(async (e) => ({
          educator: e,
          count: await Batch.countDocuments({
            educatorId: e._id,
            status: { $in: ["published", "ongoing"] },
          }),
        }))
      );
      return counts.sort((a, b) => a.count - b.count)[0].educator;
    }

    case "round_robin":
      return educators[Math.floor(Math.random() * educators.length)];

    case "manual":
    default:
      return null;
  }
}

module.exports = {
  findEligibleEducators,
  pickEducatorByStrategy,
};
