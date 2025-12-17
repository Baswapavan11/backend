// src/services/admin/enrollmentCsv.service.js
const csv = require("csv-parser");
const { Readable } = require("stream");

async function processEnrollmentCsv({
  buffer,
  batch,
  OrgUser,
  Enrollment,
  currentUser,
}) {
  if (!buffer) {
    const err = new Error("CSV file buffer is missing");
    err.statusCode = 400;
    throw err;
  }

  const rows = [];

  // 1️⃣ Parse CSV buffer
  await new Promise((resolve, reject) => {
    Readable.from(buffer)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  if (rows.length === 0) {
    const err = new Error("CSV file is empty");
    err.statusCode = 400;
    throw err;
  }

  let created = 0;
  let skipped = 0;
  const skippedRows = [];

  // 2️⃣ Process each row
  for (const row of rows) {
    const learnerId = row.learnerId;

    if (!learnerId) {
      skipped++;
      skippedRows.push({ row, reason: "Missing learnerId" });
      continue;
    }

    // 3️⃣ Validate learner
    const learner = await OrgUser.findOne({
      _id: learnerId,
      role: "learner",
      status: "active",
    });

    if (!learner) {
      skipped++;
      skippedRows.push({ learnerId, reason: "Learner not found / inactive" });
      continue;
    }

    // 4️⃣ Avoid duplicate enrollment
    const existing = await Enrollment.findOne({
      batchId: batch._id,
      learnerId,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existing) {
      skipped++;
      skippedRows.push({ learnerId, reason: "Already enrolled" });
      continue;
    }

    // 5️⃣ Create pending enrollment
    await Enrollment.create({
      batchId: batch._id,
      learnerId,
      subOrgId: batch.subOrgId || learner.subOrgId || null,
      status: "pending",
      source: "csv",
      enrolledBy: currentUser.userId,
      enrolledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    created++;
  }

  return {
    totalRows: rows.length,
    created,
    skipped,
    skippedRows,
  };
}

module.exports = {
  processEnrollmentCsv,
};
