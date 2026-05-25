const Groq = require('groq-sdk');

// Lazy-init so missing key doesn't crash on startup
let groqClient = null;

function getGroq() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

const MODEL = 'llama-3.1-8b-instant'; // replaces decommissioned llama3-8b-8192

/**
 * Core chat completion — all AI features funnel through here.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
async function chat(systemPrompt, userMessage, maxTokens = 1024) {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system',  content: systemPrompt },
      { role: 'user',    content: userMessage  },
    ],
    temperature: 0.7,
    max_tokens:  maxTokens,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Parse JSON from AI response — strips markdown fences if present.
 */
function parseJSON(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ── Feature 1: Team Chat AI Assistant ────────────────────────────────────────
async function teamChatAssistant({ message, teamName, teamSkills, projectDescription }) {
  const system = `You are an AI assistant embedded inside a team collaboration platform called TeamForge.
You are helping the team "${teamName}".
Team skills: ${teamSkills?.join(', ') || 'not specified'}.
Project context: ${projectDescription || 'general development project'}.

You help with:
- Coding questions and debugging
- Project planning and roadmaps
- Tech stack suggestions
- Hackathon ideas and strategies
- Feature brainstorming
- Architecture decisions

Keep responses concise, developer-friendly, and use markdown formatting where helpful.
Use bullet points, code blocks, and headers to structure longer answers.`;

  return await chat(system, message, 1024);
}

// ── Feature 2: Hackathon Idea Generator ──────────────────────────────────────
async function generateHackathonIdea({ domain, techStack, teamSize, difficulty, theme, problemArea }) {
  const system = `You are an expert hackathon mentor and startup idea generator.
Generate a complete, innovative, and practical hackathon project idea.
Always respond with ONLY valid JSON — no markdown fences, no extra text.`;

  const userMsg = `Generate a hackathon project idea with these parameters:
Domain: ${domain}
Tech Stack: ${techStack}
Team Size: ${teamSize}
Difficulty: ${difficulty}
Theme: ${theme}
Problem Area: ${problemArea}

Return ONLY this JSON structure (no markdown, no extra text):
{
  "projectName": "string",
  "tagline": "string",
  "problemStatement": "string",
  "solution": "string",
  "coreFeatures": ["feature1", "feature2", "feature3", "feature4", "feature5"],
  "techStack": ["tech1", "tech2", "tech3"],
  "uniqueSellingPoint": "string",
  "monetizationIdea": "string",
  "futureScope": "string",
  "implementationRoadmap": [
    { "phase": "Phase 1", "duration": "Day 1", "tasks": ["task1", "task2"] },
    { "phase": "Phase 2", "duration": "Day 2", "tasks": ["task1", "task2"] },
    { "phase": "Phase 3", "duration": "Day 3", "tasks": ["task1", "task2"] }
  ],
  "teamRoles": [
    { "role": "Frontend Developer", "responsibilities": "string" },
    { "role": "Backend Developer", "responsibilities": "string" },
    { "role": "UI/UX Designer", "responsibilities": "string" }
  ],
  "estimatedImpact": "string",
  "difficulty": "${difficulty}"
}`;

  const raw = await chat(system, userMsg, 1500);
  return parseJSON(raw);
}

// ── Feature 3: Skill Gap Analyzer ────────────────────────────────────────────
async function analyzeSkillGap({ currentSkills, targetRole, experienceLevel, careerPath }) {
  const system = `You are a senior tech career coach and skills assessment expert.
Analyze skill gaps and provide actionable learning roadmaps.
Always respond with ONLY valid JSON — no markdown fences, no extra text.`;

  const userMsg = `Analyze the skill gap for this developer:
Current Skills: ${currentSkills?.join(', ') || 'none listed'}
Target Role: ${targetRole}
Current Experience Level: ${experienceLevel}
Career Path: ${careerPath}

Return ONLY this JSON structure:
{
  "targetRole": "${targetRole}",
  "overallReadiness": 45,
  "currentStrengths": ["strength1", "strength2", "strength3"],
  "missingSkills": [
    { "skill": "string", "priority": "high|medium|low", "reason": "string" }
  ],
  "learningRoadmap": [
    { "week": "Week 1-2", "focus": "string", "resources": ["resource1", "resource2"], "goal": "string" },
    { "week": "Week 3-4", "focus": "string", "resources": ["resource1", "resource2"], "goal": "string" },
    { "week": "Week 5-8", "focus": "string", "resources": ["resource1", "resource2"], "goal": "string" },
    { "week": "Week 9-12", "focus": "string", "resources": ["resource1", "resource2"], "goal": "string" }
  ],
  "recommendedProjects": [
    { "name": "string", "description": "string", "skills": ["skill1", "skill2"] }
  ],
  "interviewTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "certifications": [
    { "name": "string", "provider": "string", "priority": "high|medium" }
  ],
  "prioritySkills": ["skill1", "skill2", "skill3"],
  "timelineToJobReady": "string",
  "salaryRange": "string",
  "jobMarketDemand": "high|medium|low"
}`;

  const raw = await chat(system, userMsg, 1500);
  return parseJSON(raw);
}

// ── Feature 4: AI Team Recommendations ───────────────────────────────────────
async function aiTeamRecommendations({ currentUser, candidates }) {
  const system = `You are an AI team formation expert for a developer collaboration platform.
Analyze developer profiles and determine team compatibility.
Always respond with ONLY valid JSON — no markdown fences, no extra text.`;

  // Limit candidates to avoid token overflow
  const top = candidates.slice(0, 8);

  const userMsg = `Analyze team compatibility between the current user and candidates.

Current User:
- Name: ${currentUser.name}
- Skills: ${currentUser.skills?.join(', ') || 'none'}
- Experience: ${currentUser.experienceLevel}
- Availability: ${currentUser.availability}
- Role: ${currentUser.role}

Candidates:
${top.map((c, i) => `${i + 1}. ${c.name} | Skills: ${c.skills?.join(', ') || 'none'} | Exp: ${c.experienceLevel} | Avail: ${c.availability} | Role: ${c.role}`).join('\n')}

Return ONLY this JSON array (one object per candidate, same order):
[
  {
    "candidateIndex": 0,
    "compatibilityScore": 85,
    "matchingSkills": ["skill1", "skill2"],
    "complementarySkills": ["skill3", "skill4"],
    "suggestedRole": "string",
    "whyGoodMatch": "string",
    "collaborationStyle": "string",
    "riskFactors": "string or null"
  }
]`;

  const raw = await chat(system, userMsg, 1200);
  const aiResults = parseJSON(raw);

  // Merge AI insights with candidate data
  return top.map((candidate, i) => {
    const ai = aiResults.find(r => r.candidateIndex === i) || aiResults[i] || {};
    return {
      user: candidate,
      compatibility: {
        score:               ai.compatibilityScore || 50,
        matchingSkills:      ai.matchingSkills || [],
        complementarySkills: ai.complementarySkills || [],
        suggestedRole:       ai.suggestedRole || 'Team Member',
        whyGoodMatch:        ai.whyGoodMatch || 'Compatible profiles',
        collaborationStyle:  ai.collaborationStyle || '',
        riskFactors:         ai.riskFactors || null,
      },
    };
  }).sort((a, b) => b.compatibility.score - a.compatibility.score);
}

// ── Feature 5: AI Team-Mode Recommendations ──────────────────────────────────
async function aiTeamModeRecommendations({ teamName, requiredSkills, missingSkills, combinedMemberSkills, candidates, projectType }) {
  const system = `You are an expert team formation AI for a developer collaboration platform called TeamForge.
Your job is to analyze which candidates best COMPLETE a team by filling skill gaps.
Always respond with ONLY valid JSON — no markdown fences, no extra text.`;

  const top = candidates.slice(0, 8);

  const userMsg = `Analyze which candidates best complete this team's missing skills.

Team: "${teamName}" (${projectType || 'software project'})
Required Skills: ${requiredSkills.join(', ') || 'not specified'}
Current Team Skills: ${combinedMemberSkills.join(', ') || 'none'}
Missing Skills: ${missingSkills.join(', ') || 'none'}

Candidates:
${top.map((c, i) => `${i + 1}. ${c.name} | Skills: ${c.skills?.join(', ') || 'none'} | Exp: ${c.experienceLevel} | Avail: ${c.availability} | Role: ${c.role}`).join('\n')}

Return ONLY this JSON array (one object per candidate, same order):
[
  {
    "candidateIndex": 0,
    "compatibilityScore": 88,
    "skillsFulfilled": ["Express.js", "JavaScript"],
    "suggestedRole": "Backend Developer",
    "whyGoodMatch": "string explaining why this person completes the team",
    "teamImpact": "string describing how they improve team balance",
    "riskFactors": "string or null"
  }
]`;

  const raw = await chat(system, userMsg, 1200);
  const aiResults = parseJSON(raw);

  return top.map((candidate, i) => {
    const ai = aiResults.find(r => r.candidateIndex === i) || aiResults[i] || {};
    return {
      user: candidate,
      compatibility: {
        score:           ai.compatibilityScore || 50,
        skillsFulfilled: ai.skillsFulfilled    || [],
        suggestedRole:   ai.suggestedRole      || 'Team Member',
        whyGoodMatch:    ai.whyGoodMatch       || 'Complements team skills',
        teamImpact:      ai.teamImpact         || '',
        riskFactors:     ai.riskFactors        || null,
        mode:            'team',
      },
    };
  }).sort((a, b) => b.compatibility.score - a.compatibility.score);
}

module.exports = {
  teamChatAssistant,
  generateHackathonIdea,
  analyzeSkillGap,
  aiTeamRecommendations,
  aiTeamModeRecommendations,
};
