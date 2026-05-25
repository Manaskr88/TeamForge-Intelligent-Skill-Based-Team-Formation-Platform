const User = require('../models/User.model');
const Team = require('../models/Team.model');

// ── Shared scoring helpers ────────────────────────────────────────────────────
const experienceLevels   = { beginner: 1, intermediate: 2, advanced: 3 };
const availabilityScores = { 'full-time': 3, 'part-time': 2, 'weekends-only': 1, 'not-available': 0 };

const calculateCompatibility = (currentUser, candidate) => {
  const userSkills      = currentUser.skills.map(s => s.toLowerCase());
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());

  const complementarySkills = candidateSkills.filter(s => !userSkills.includes(s));
  const commonSkills        = candidateSkills.filter(s => userSkills.includes(s));

  const totalUniqueSkills = new Set([...userSkills, ...candidateSkills]).size;
  const skillScore = totalUniqueSkills > 0
    ? (complementarySkills.length * 0.6 + commonSkills.length * 0.4) / Math.max(totalUniqueSkills, 1)
    : 0;

  const userExp      = experienceLevels[currentUser.experienceLevel] || 1;
  const candidateExp = experienceLevels[candidate.experienceLevel]   || 1;
  const expDiff      = Math.abs(userExp - candidateExp);
  const experienceScore = expDiff === 0 ? 1 : expDiff === 1 ? 0.6 : 0.2;

  const userAvail      = availabilityScores[currentUser.availability] || 0;
  const candidateAvail = availabilityScores[candidate.availability]   || 0;
  const availScore = userAvail > 0 && candidateAvail > 0
    ? Math.min(userAvail, candidateAvail) / Math.max(userAvail, candidateAvail)
    : 0;

  const totalScore = (skillScore * 0.5) + (experienceScore * 0.3) + (availScore * 0.2);

  return {
    score:            Math.round(totalScore * 100),
    skillMatch:       Math.round(skillScore * 100),
    experienceMatch:  Math.round(experienceScore * 100),
    availabilityMatch:Math.round(availScore * 100),
    commonSkills,
    complementarySkills,
    reasons: buildPersonalReasons(commonSkills, complementarySkills, expDiff, candidateAvail),
  };
};

const buildPersonalReasons = (common, complementary, expDiff, avail) => {
  const r = [];
  if (complementary.length > 0) r.push(`Brings ${complementary.slice(0, 3).join(', ')} skills you don't have`);
  if (common.length > 0)        r.push(`Shares ${common.slice(0, 2).join(', ')} expertise`);
  if (expDiff === 0)             r.push('Same experience level — great for peer collaboration');
  if (expDiff === 1)             r.push('Complementary experience levels');
  if (avail >= 2)                r.push('High availability for collaboration');
  return r;
};

// ── Team-mode scoring ─────────────────────────────────────────────────────────
// Score = (Missing Skill Match × 0.6) + (Experience Match × 0.2) + (Availability Match × 0.2)
const calculateTeamCompatibility = (missingSkills, candidate, teamAvgExp) => {
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());
  const missing         = missingSkills.map(s => s.toLowerCase());

  // How many missing skills does this candidate cover?
  const skillsFulfilled = missing.filter(s => candidateSkills.includes(s));
  const skillScore      = missing.length > 0 ? skillsFulfilled.length / missing.length : 0;

  // Experience match vs team average
  const candidateExp  = experienceLevels[candidate.experienceLevel] || 1;
  const expDiff       = Math.abs(candidateExp - teamAvgExp);
  const experienceScore = expDiff === 0 ? 1 : expDiff <= 1 ? 0.7 : 0.3;

  // Availability
  const candidateAvail  = availabilityScores[candidate.availability] || 0;
  const availScore      = candidateAvail >= 2 ? 1 : candidateAvail === 1 ? 0.5 : 0;

  const totalScore = (skillScore * 0.6) + (experienceScore * 0.2) + (availScore * 0.2);

  return {
    score:            Math.round(totalScore * 100),
    skillsFulfilled,
    missingSkillsCount: missing.length,
    experienceMatch:  Math.round(experienceScore * 100),
    availabilityMatch:Math.round(availScore * 100),
    reasons: buildTeamReasons(skillsFulfilled, missing, expDiff, candidateAvail),
  };
};

const buildTeamReasons = (fulfilled, missing, expDiff, avail) => {
  const r = [];
  if (fulfilled.length > 0)
    r.push(`Covers ${fulfilled.slice(0, 3).join(', ')} — skills your team is missing`);
  if (fulfilled.length === missing.length && missing.length > 0)
    r.push('Completes all missing team skills');
  if (expDiff <= 1) r.push('Experience level fits the team');
  if (avail >= 2)   r.push('High availability for collaboration');
  return r;
};

// ── GET /api/recommendations/teammates  (For Me) ─────────────────────────────
const getRecommendedTeammates = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const { limit = 10, skills } = req.query;

    let query = { _id: { $ne: req.user._id } };
    if (skills) {
      query.skills = { $in: skills.split(',').map(s => s.trim()) };
    }

    const candidates = await User.find(query).select('-password').limit(100);

    const recommendations = candidates
      .map(c => ({ user: c, compatibility: calculateCompatibility(currentUser, c) }))
      .filter(r => r.compatibility.score > 20)
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, parseInt(limit));

    res.json({ success: true, recommendations });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/recommendations/team/:teamId  (For Team) ────────────────────────
const getTeamRecommendations = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limit = 12 } = req.query;

    // Fetch team with full member data
    const team = await Team.findById(teamId)
      .populate('members.user', 'name skills experienceLevel availability');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // Verify requester is a member
    const isMember = team.members.some(m => m.user?._id?.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a team member' });

    // Collect all current member IDs and their combined skills
    const memberIds     = team.members.map(m => m.user?._id?.toString()).filter(Boolean);
    const combinedSkills = [...new Set(
      team.members.flatMap(m => (m.user?.skills || []).map(s => s.toLowerCase()))
    )];

    // Required skills from team definition
    const requiredSkills = (team.requiredSkills || []).map(s => s.toLowerCase());

    // Missing skills = required - combined member skills
    const missingSkills = requiredSkills.filter(s => !combinedSkills.includes(s));

    // If no required skills defined, fall back to personal recommendations
    if (requiredSkills.length === 0) {
      const currentUser = await User.findById(req.user._id);
      const candidates  = await User.find({ _id: { $nin: memberIds } }).select('-password').limit(80);
      const recs = candidates
        .map(c => ({ user: c, compatibility: calculateCompatibility(currentUser, c) }))
        .filter(r => r.compatibility.score > 20)
        .sort((a, b) => b.compatibility.score - a.compatibility.score)
        .slice(0, parseInt(limit));
      return res.json({
        success: true, recommendations: recs,
        teamInfo: { name: team.name, requiredSkills: [], missingSkills: [], combinedSkills },
        mode: 'personal-fallback',
      });
    }

    // Calculate team average experience
    const expValues  = team.members.map(m => experienceLevels[m.user?.experienceLevel] || 1);
    const teamAvgExp = expValues.reduce((a, b) => a + b, 0) / (expValues.length || 1);

    // Fetch candidates not already in team
    // Prioritise users who have at least one missing skill
    let candidates;
    if (missingSkills.length > 0) {
      candidates = await User.find({
        _id:    { $nin: memberIds },
        skills: { $in: missingSkills },
      }).select('-password').limit(80);

      // If too few, top up with anyone
      if (candidates.length < 6) {
        const extra = await User.find({
          _id: { $nin: [...memberIds, ...candidates.map(c => c._id.toString())] },
        }).select('-password').limit(30);
        candidates = [...candidates, ...extra];
      }
    } else {
      // All required skills covered — recommend based on personal compatibility
      const currentUser = await User.findById(req.user._id);
      candidates = await User.find({ _id: { $nin: memberIds } }).select('-password').limit(80);
      const recs = candidates
        .map(c => ({ user: c, compatibility: calculateCompatibility(currentUser, c) }))
        .filter(r => r.compatibility.score > 20)
        .sort((a, b) => b.compatibility.score - a.compatibility.score)
        .slice(0, parseInt(limit));
      return res.json({
        success: true, recommendations: recs,
        teamInfo: { name: team.name, requiredSkills, missingSkills: [], combinedSkills },
        mode: 'team-complete',
      });
    }

    const recommendations = candidates
      .map(c => ({
        user:          c,
        compatibility: calculateTeamCompatibility(missingSkills, c, teamAvgExp),
      }))
      .filter(r => r.compatibility.score > 10)
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      recommendations,
      teamInfo: {
        name:          team.name,
        requiredSkills,
        missingSkills,
        combinedSkills,
        memberCount:   team.members.length,
        maxMembers:    team.maxMembers,
      },
      mode: 'team',
    });
  } catch (err) {
    console.error('Team recommendation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/recommendations/compatibility/:userId ────────────────────────────
const getCompatibilityScore = async (req, res) => {
  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(req.params.userId),
    ]);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    const compatibility = calculateCompatibility(currentUser, targetUser);
    res.json({ success: true, compatibility, targetUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getRecommendedTeammates, getTeamRecommendations, getCompatibilityScore };
