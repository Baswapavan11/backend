function calculateProfileCompleteness(profile = {}) {
  let score = 0;
  const total = 6;

  if (profile.title) score++;
  if (profile.bio) score++;
  if (profile.highestQualification) score++;
  if (profile.yearsOfExperience > 0) score++;
  if (profile.expertiseAreas?.length) score++;
  if (profile.languages?.length) score++;

  return Math.round((score / total) * 100);
}

module.exports = { calculateProfileCompleteness };
