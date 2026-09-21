const aiService = require('../services/ai.service');
const User      = require('../models/User.model');
const Team      = require('../models/Team.model');
const SavedIdea = require('../models/SavedIdea.model');

// ── Feature 1: Team Chat AI Assistant ────────────────────────────────────────
// POST /api/ai/chat
const chatAssistant = async (req, res) => {
  try {
    const { message, teamId } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Fetch team context if teamId provided
    let teamName = 'your team';
    let teamSkills = [];
    let projectDescription = '';

    if (teamId) {
      const team = await Team.findById(teamId).select('name requiredSkills description projectType');
      if (team) {
        teamName = team.name;
        teamSkills = team.requiredSkills || [];
        projectDescription = `${team.description} (${team.projectType?.replace(/-/g, ' ')})`;
      }
    }

    const response = await aiService.teamChatAssistant({
      message: message.trim(),
      teamName,
      teamSkills,
      projectDescription,
    });

    res.json({ success: true, response });
  } catch (err) {
    console.error('AI chat error:', err.message);
    // err.message is already a clean user-facing string from classifyGroqError
    res.status(500).json({ success: false, message: err.message || 'AI service error. Please try again.' });
  }
};

// ── Feature 2: Hackathon Idea Generator ──────────────────────────────────────
// POST /api/ai/generate-idea
const generateIdea = async (req, res) => {
  try {
    const { domain, techStack, teamSize, difficulty, theme, problemArea } = req.body;

    if (!domain || !techStack) {
      return res.status(400).json({ success: false, message: 'Domain and tech stack are required' });
    }

    const idea = await aiService.generateHackathonIdea({
      domain,
      techStack: Array.isArray(techStack) ? techStack.join(', ') : techStack,
      teamSize:  teamSize   || '3-4 people',
      difficulty: difficulty || 'intermediate',
      theme:     theme      || 'open',
      problemArea: problemArea || 'general',
    });

    res.json({ success: true, idea });
  } catch (err) {
    console.error('Idea generator error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to generate idea. Please try again.' });
  }
};

// POST /api/ai/save-idea
const saveIdea = async (req, res) => {
  try {
    const { idea, domain, theme } = req.body;
    if (!idea?.projectName) {
      return res.status(400).json({ success: false, message: 'Invalid idea data' });
    }

    const saved = await SavedIdea.create({
      user:             req.user._id,
      projectName:      idea.projectName,
      tagline:          idea.tagline || '',
      domain:           domain || '',
      theme:            theme  || '',
      techStack:        idea.techStack || [],
      coreFeatures:     idea.coreFeatures || [],
      problemStatement: idea.problemStatement || '',
      solution:         idea.solution || '',
      uniqueSellingPoint: idea.uniqueSellingPoint || '',
      fullData:         idea,
    });

    res.status(201).json({ success: true, message: 'Idea saved!', saved });
  } catch (err) {
    console.error('Save idea error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save idea' });
  }
};

// GET /api/ai/saved-ideas
const getSavedIdeas = async (req, res) => {
  try {
    const ideas = await SavedIdea.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, ideas });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/ai/saved-ideas/:id
const deleteSavedIdea = async (req, res) => {
  try {
    await SavedIdea.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Idea deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Feature 3: Skill Gap Analyzer ────────────────────────────────────────────
// POST /api/ai/skill-gap-analysis
const skillGapAnalysis = async (req, res) => {
  try {
    const { targetRole, careerPath, experienceLevel, currentSkills } = req.body;

    if (!targetRole) {
      return res.status(400).json({ success: false, message: 'Target role is required' });
    }

    // Use provided skills or fall back to user's profile skills
    const skills = currentSkills?.length
      ? currentSkills
      : req.user.skills || [];

    const analysis = await aiService.analyzeSkillGap({
      currentSkills:   skills,
      targetRole,
      experienceLevel: experienceLevel || req.user.experienceLevel || 'beginner',
      careerPath:      careerPath || targetRole,
    });

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Skill gap error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to analyze skill gap. Please try again.' });
  }
};

// ── Feature 4: AI Team Recommendations ───────────────────────────────────────
// POST /api/ai/team-recommendations
const aiTeamRecommendations = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('-password');
    const { limit = 10 } = req.query;

    // Fetch candidates (exclude self)
    const candidates = await User.find({ _id: { $ne: req.user._id } })
      .select('name skills experienceLevel availability role bio avatar isOnline')
      .limit(10)
      .lean();

    if (candidates.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    const recommendations = await aiService.aiTeamRecommendations({
      currentUser: {
        name:            currentUser.name,
        skills:          currentUser.skills,
        experienceLevel: currentUser.experienceLevel,
        availability:    currentUser.availability,
        role:            currentUser.role,
      },
      candidates,
    });

    res.json({
      success: true,
      recommendations: recommendations.slice(0, parseInt(limit)),
    });
  } catch (err) {
    console.error('AI recommendations error — full error:', JSON.stringify({
      message: err.message,
      status: err.status,
      code: err.code,
      type: err.error?.type,
      groqMsg: err.error?.message,
    }));
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get AI recommendations. Please try again.',
    });
  }
};

// ── Feature 5: AI Team-Mode Recommendations ─────────────────────────────────
// POST /api/ai/team-analysis
const aiTeamAnalysis = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

    const TeamModel = require('../models/Team.model');
    const team = await TeamModel.findById(teamId)
      .populate('members.user', 'name skills experienceLevel availability role');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const isMember = team.members.some(m => m.user?._id?.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a team member' });

    const memberIds      = team.members.map(m => m.user?._id?.toString()).filter(Boolean);
    const combinedSkills = [...new Set(team.members.flatMap(m => (m.user?.skills || []).map(s => s.toLowerCase())))];
    const requiredSkills = (team.requiredSkills || []).map(s => s.toLowerCase());
    const missingSkills  = requiredSkills.filter(s => !combinedSkills.includes(s));

    // Fetch candidates who have at least one missing skill
    let candidates = [];
    if (missingSkills.length > 0) {
      candidates = await User.find({ _id: { $nin: memberIds }, skills: { $in: missingSkills } })
        .select('name skills experienceLevel availability role bio avatar isOnline')
        .limit(10).lean();
      if (candidates.length < 3) {
        const extra = await User.find({
          _id: { $nin: [...memberIds, ...candidates.map(c => c._id.toString())] },
        })
          .select('name skills experienceLevel availability role bio avatar isOnline')
          .limit(5).lean();
        candidates = [...candidates, ...extra];
      }
    } else {
      candidates = await User.find({ _id: { $nin: memberIds } })
        .select('name skills experienceLevel availability role bio avatar isOnline')
        .limit(10).lean();
    }

    if (candidates.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        teamInfo: { name: team.name, requiredSkills, missingSkills, combinedSkills },
      });
    }

    const recommendations = await aiService.aiTeamModeRecommendations({
      teamName:             team.name,
      requiredSkills,
      missingSkills,
      combinedMemberSkills: combinedSkills,
      candidates,
      projectType:          team.projectType,
    });

    res.json({
      success: true,
      recommendations,
      teamInfo: {
        name: team.name,
        requiredSkills,
        missingSkills,
        combinedSkills,
        memberCount: team.members.length,
        maxMembers: team.maxMembers,
      },
    });
  } catch (err) {
    console.error('AI team analysis error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get AI team analysis. Please try again.',
    });
  }
};

// ── Feature 6: Extract project details from free-text description ─────────────
// POST /api/ai/extract-project-details
const extractProjectDetails = async (req, res) => {
  try {
    const { problemArea } = req.body;
    if (!problemArea?.trim()) {
      return res.status(400).json({ success: false, message: 'problemArea is required' });
    }
    if (problemArea.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Please describe your project in more detail' });
    }

    const details = await aiService.extractProjectDetails({ problemArea: problemArea.trim() });
    res.json({ success: true, details });
  } catch (err) {
    console.error('Extract project details error:', err.message);
    // Return safe defaults — this is a non-critical helper endpoint
    res.json({
      success: true,
      details: { domain: 'General', techStack: [], teamSize: '3-4', difficulty: 'intermediate', theme: 'Open Innovation' },
    });
  }
};

module.exports = {
  chatAssistant,
  generateIdea,
  saveIdea,
  getSavedIdeas,
  deleteSavedIdea,
  skillGapAnalysis,
  aiTeamRecommendations,
  aiTeamAnalysis,
  extractProjectDetails,
};
