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

const MODEL = 'qwen/qwen3.6-27b'; // confirmed available on this Groq account

/**
 * Core chat completion for plain text responses (chat assistant).
 */
async function chat(systemPrompt, userMessage, maxTokens = 800) {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    temperature: 0.7,
    max_tokens:  maxTokens,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * JSON-specific completion — forces response_format: json_object.
 * Use this for all features that need parseable JSON back.
 */
async function chatJSON(systemPrompt, userMessage, maxTokens = 1000) {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt + '\nRespond with valid JSON only.' },
      { role: 'user',   content: userMessage  },
    ],
    temperature: 0.6,
    max_tokens:  maxTokens,
    response_format: { type: 'json_object' },
    // Disable thinking mode for Qwen3 to avoid <think> tokens wasting TPM
    reasoning_effort: 'none',
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Parse JSON from AI response — strips markdown fences and reasoning tags if present.
 * openai/gpt-oss-20b (reasoning model) may emit <think>...</think> before the JSON.
 */
function parseJSON(text) {
  // Strip <think>...</think> blocks (reasoning model output)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  // Strip markdown fences
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  // Extract the first valid JSON object or array
  const objMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (objMatch) cleaned = objMatch[1]
  return JSON.parse(cleaned)
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
  const system = `You are a hackathon mentor. Generate creative project ideas and return JSON.`;

  const userMsg = `Generate a hackathon idea:
Domain: ${domain} | Tech: ${techStack} | Size: ${teamSize} | Difficulty: ${difficulty} | Theme: ${theme}
Problem: ${problemArea}

Return JSON:
{
  "projectName": "string",
  "tagline": "string",
  "problemStatement": "string",
  "solution": "string",
  "coreFeatures": ["f1","f2","f3","f4","f5"],
  "techStack": ["t1","t2","t3"],
  "uniqueSellingPoint": "string",
  "monetizationIdea": "string",
  "futureScope": "string",
  "implementationRoadmap": [
    {"phase":"Phase 1","duration":"Day 1","tasks":["t1","t2"]},
    {"phase":"Phase 2","duration":"Day 2","tasks":["t1","t2"]},
    {"phase":"Phase 3","duration":"Day 3","tasks":["t1","t2"]}
  ],
  "teamRoles": [
    {"role":"Frontend Developer","responsibilities":"string"},
    {"role":"Backend Developer","responsibilities":"string"},
    {"role":"UI/UX Designer","responsibilities":"string"}
  ],
  "estimatedImpact": "string",
  "difficulty": "${difficulty}"
}`;

  const raw = await chatJSON(system, userMsg, 1000);
  return parseJSON(raw);
}

// ── Feature 3: Skill Gap Analyzer ────────────────────────────────────────────
async function analyzeSkillGap({ currentSkills, targetRole, experienceLevel, careerPath }) {
  const system = `You are a tech career coach. Analyze skill gaps and return JSON.`;

  const userMsg = `Skill gap analysis:
Skills: ${currentSkills?.slice(0,8).join(', ') || 'none'}
Target: ${targetRole} | Level: ${experienceLevel}

Return JSON:
{
  "targetRole": "${targetRole}",
  "overallReadiness": 45,
  "currentStrengths": ["s1","s2","s3"],
  "missingSkills": [{"skill":"string","priority":"high","reason":"string"}],
  "learningRoadmap": [
    {"week":"Week 1-2","focus":"string","resources":["r1","r2"],"goal":"string"},
    {"week":"Week 3-4","focus":"string","resources":["r1","r2"],"goal":"string"},
    {"week":"Week 5-8","focus":"string","resources":["r1","r2"],"goal":"string"},
    {"week":"Week 9-12","focus":"string","resources":["r1","r2"],"goal":"string"}
  ],
  "recommendedProjects": [{"name":"string","description":"string","skills":["s1","s2"]}],
  "interviewTopics": ["t1","t2","t3","t4","t5"],
  "certifications": [{"name":"string","provider":"string","priority":"high"}],
  "prioritySkills": ["s1","s2","s3"],
  "timelineToJobReady": "string",
  "salaryRange": "string",
  "jobMarketDemand": "high"
}`;

  const raw = await chatJSON(system, userMsg, 1000);
  return parseJSON(raw);
}

// ── Feature 4: AI Team Recommendations ───────────────────────────────────────
async function aiTeamRecommendations({ currentUser, candidates }) {
  const system = `You are a team formation AI. Analyze developer compatibility and return JSON.`;

  // Cap at 5 to keep prompt small
  const top = candidates.slice(0, 5);

  const userMsg = `Rate compatibility between user and each candidate (0-100).

User: ${currentUser.name} | Skills: ${currentUser.skills?.slice(0,5).join(', ') || 'none'} | Exp: ${currentUser.experienceLevel}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0,5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Return JSON:
{
  "results": [
    { "candidateIndex": 0, "compatibilityScore": 85, "matchingSkills": ["skill1"], "complementarySkills": ["skill2"], "suggestedRole": "string", "whyGoodMatch": "one sentence" }
  ]
}`;

  const raw = await chatJSON(system, userMsg, 800);
  const parsed = parseJSON(raw);
  const aiResults = Array.isArray(parsed) ? parsed : (parsed.results || []);

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
  const system = `You are a team formation AI. Find candidates who fill missing skill gaps and return JSON.`;

  const top = candidates.slice(0, 5);

  const userMsg = `Team "${teamName}" needs: ${missingSkills.slice(0,5).join(', ') || 'general skills'}
Has: ${combinedMemberSkills.slice(0,5).join(', ') || 'none'}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0,5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Return JSON:
{
  "results": [
    { "candidateIndex": 0, "compatibilityScore": 88, "skillsFulfilled": ["skill1"], "suggestedRole": "string", "whyGoodMatch": "one sentence", "teamImpact": "one sentence" }
  ]
}`;

  const raw = await chatJSON(system, userMsg, 800);
  const parsed = parseJSON(raw);
  const aiResults = Array.isArray(parsed) ? parsed : (parsed.results || []);

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

// ── Feature 6: Extract project details from free-text description ─────────────
async function extractProjectDetails({ problemArea }) {
  const system = `You are a smart project details extractor for a hackathon platform.
Extract structured project information from a natural language description.
If a field cannot be determined, use sensible defaults.`;

  const userMsg = `Extract project details from this description:
"${problemArea}"

Respond with this JSON:
{
  "domain": "string (e.g. Healthcare, Education, Fintech, Productivity, E-commerce, Social Impact, Environment, Cybersecurity, AI/ML, Blockchain, Gaming, Travel, Food Tech, General)",
  "techStack": ["tech1", "tech2", "tech3"],
  "teamSize": "string (e.g. 3-4, 5-6, 1-2)",
  "difficulty": "beginner",
  "theme": "string (e.g. HealthTech, EdTech, FinTech, Open Innovation, AI-First, Climate Tech, Social Good, Smart Cities, Web3, Future of Work)"
}

Rules:
- techStack: extract any technologies mentioned. If MERN mentioned, expand to ["React", "Node.js", "Express.js", "MongoDB"]
- teamSize: convert "4 members" to "3-4", "team of 5" to "5-6"
- difficulty must be one of: beginner, intermediate, advanced`;

  const raw = await chatJSON(system, userMsg, 400);
  try {
    return parseJSON(raw);
  } catch {
    return { domain: 'General', techStack: [], teamSize: '3-4', difficulty: 'intermediate', theme: 'Open Innovation' };
  }
}

module.exports = {
  teamChatAssistant,
  generateHackathonIdea,
  analyzeSkillGap,
  aiTeamRecommendations,
  aiTeamModeRecommendations,
  extractProjectDetails,
};
