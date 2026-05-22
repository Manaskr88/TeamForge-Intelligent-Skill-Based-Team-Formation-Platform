const User = require('../models/User.model');

// Compatibility score formula:
// Score = (Skill Match × 0.5) + (Experience Match × 0.3) + (Availability Match × 0.2)

const experienceLevels = { beginner: 1, intermediate: 2, advanced: 3 };
const availabilityScores = { 'full-time': 3, 'part-time': 2, 'weekends-only': 1, 'not-available': 0 };

const calculateCompatibility = (currentUser, candidate) => {
  // Skill match
  const userSkills = currentUser.skills.map(s => s.toLowerCase());
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());

  // Complementary skills (skills candidate has that user doesn't)
  const complementarySkills = candidateSkills.filter(s => !userSkills.includes(s));
  const commonSkills = candidateSkills.filter(s => userSkills.includes(s));

  // Skill score: reward complementary skills more
  const totalUniqueSkills = new Set([...userSkills, ...candidateSkills]).size;
  const skillScore = totalUniqueSkills > 0
    ? (complementarySkills.length * 0.6 + commonSkills.length * 0.4) / Math.max(totalUniqueSkills, 1)
    : 0;

  // Experience match (closer levels = better for collaboration)
  const userExp = experienceLevels[currentUser.experienceLevel] || 1;
  const candidateExp = experienceLevels[candidate.experienceLevel] || 1;
  const expDiff = Math.abs(userExp - candidateExp);
  const experienceScore = expDiff === 0 ? 1 : expDiff === 1 ? 0.6 : 0.2;

  // Availability match
  const userAvail = availabilityScores[currentUser.availability] || 0;
  const candidateAvail = availabilityScores[candidate.availability] || 0;
  const availScore = userAvail > 0 && candidateAvail > 0
    ? Math.min(userAvail, candidateAvail) / Math.max(userAvail, candidateAvail)
    : 0;

  const totalScore = (skillScore * 0.5) + (experienceScore * 0.3) + (availScore * 0.2);
  const percentage = Math.round(totalScore * 100);

  return {
    score: percentage,
    skillMatch: Math.round(skillScore * 100),
    experienceMatch: Math.round(experienceScore * 100),
    availabilityMatch: Math.round(availScore * 100),
    commonSkills,
    complementarySkills,
    reasons: buildReasons(commonSkills, complementarySkills, expDiff, candidateAvail)
  };
};

const buildReasons = (common, complementary, expDiff, avail) => {
  const reasons = [];
  if (complementary.length > 0) reasons.push(`Brings ${complementary.slice(0, 3).join(', ')} skills you don't have`);
  if (common.length > 0) reasons.push(`Shares ${common.slice(0, 2).join(', ')} expertise`);
  if (expDiff === 0) reasons.push('Same experience level — great for peer collaboration');
  if (expDiff === 1) reasons.push('Complementary experience levels');
  if (avail >= 2) reasons.push('High availability for collaboration');
  return reasons;
};

// @desc    Get recommended teammates
// @route   GET /api/recommendations/teammates
// @access  Private
const getRecommendedTeammates = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const { limit = 10, skills } = req.query;

    let query = { _id: { $ne: req.user._id } };
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }

    const candidates = await User.find(query).select('-password').limit(100);

    const recommendations = candidates
      .map(candidate => ({
        user: candidate,
        compatibility: calculateCompatibility(currentUser, candidate)
      }))
      .filter(r => r.compatibility.score > 20)
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, parseInt(limit));

    res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get compatibility score between two users
// @route   GET /api/recommendations/compatibility/:userId
// @access  Private
const getCompatibilityScore = async (req, res) => {
  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(req.params.userId)
    ]);

    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const compatibility = calculateCompatibility(currentUser, targetUser);
    res.json({ success: true, compatibility, targetUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getRecommendedTeammates, getCompatibilityScore };
