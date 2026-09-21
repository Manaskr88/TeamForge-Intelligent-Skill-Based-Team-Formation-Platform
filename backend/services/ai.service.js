const Groq = require('groq-sdk');

// ── Groq client (lazy-init) ───────────────────────────────────────────────────
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

// ── Model selection ───────────────────────────────────────────────────────────
// Groq's available models depend on your account tier. Rather than hardcoding
// a model that may not be available, we probe the /models endpoint once at
// first use and pick the best available chat model automatically.
//
// Priority order (best to cheapest/fastest):
const MODEL_PREFERENCE = [
  'llama-3.3-70b-versatile',           // best quality, Enterprise
  'llama-3.1-8b-instant',              // fast, Enterprise
  'meta-llama/llama-4-scout-17b-16e-instruct', // free tier
  'llama3-70b-8192',                   // older free tier id
  'llama3-8b-8192',                    // older free tier id
  'openai/gpt-oss-20b',               // free tier developer plan
  'openai/gpt-oss-120b',              // free tier developer plan
  'qwen/qwen3.8-27b',                 // free tier developer plan
  'moonshotai/kimi-k2-instruct',       // free tier
  'gemma2-9b-it',                      // older free tier
  'mixtral-8x7b-32768',               // older free tier
];

let resolvedModel = null;   // cached after first discovery

/**
 * Discovers which model to use by querying /models with the actual API key.
 * Result is cached so this only runs once per server lifetime.
 */
async function resolveModel() {
  if (resolvedModel) return resolvedModel;

  try {
    const groq = getGroq();
    const { data: models } = await groq.models.list();
    const availableIds = new Set(models.map(m => m.id));

    for (const candidate of MODEL_PREFERENCE) {
      if (availableIds.has(candidate)) {
        resolvedModel = candidate;
        console.log(`🤖 AI model selected: ${resolvedModel}`);
        return resolvedModel;
      }
    }

    // None of our preferences matched — use whatever the first chat model is
    const firstChat = models.find(m => m.object === 'model' && !m.id.includes('whisper') && !m.id.includes('guard'));
    if (firstChat) {
      resolvedModel = firstChat.id;
      console.log(`🤖 AI model fallback: ${resolvedModel}`);
      return resolvedModel;
    }

    throw new Error('No usable chat model found on this Groq account');
  } catch (err) {
    // If discovery itself fails (network, bad key), surface a clear error
    console.error('❌ Groq model discovery failed:', err.message);
    throw new Error(classifyGroqError(err));
  }
}

// ── Timeout ───────────────────────────────────────────────────────────────────
const GROQ_TIMEOUT_MS = 25000;

function withTimeout(promise, ms = GROQ_TIMEOUT_MS, label = 'AI request') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s. The AI service may be busy — please try again.`)),
      ms
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// ── Error classification ──────────────────────────────────────────────────────
function classifyGroqError(err) {
  const msg = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || 0;

  if (msg.includes('groq_api_key') || msg.includes('api key is not set')) {
    return 'The AI service is not configured. Please contact support.';
  }
  if (msg.includes('invalid_api_key') || msg.includes('invalid api key') || status === 401) {
    return 'The AI service has an invalid API key. Please contact support.';
  }
  if (msg.includes('rate_limit') || msg.includes('rate limit') || status === 429) {
    return 'The AI service is busy right now. Please wait a moment and try again.';
  }
  if (msg.includes('model_not_found') || msg.includes('does not exist') || msg.includes('model not found') || status === 404) {
    return 'The AI model is temporarily unavailable. Please try again in a moment.';
  }
  if (msg.includes('timed out') || msg.includes('timeout')) {
    return 'The AI request took too long. Please try again.';
  }
  if (msg.includes('context_length') || msg.includes('context length') || msg.includes('maximum context')) {
    return 'Your request is too long for the AI to process. Try a shorter input.';
  }
  if (msg.includes('service_unavailable') || status === 503) {
    return 'The AI service is temporarily unavailable. Please try again shortly.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnreset') || msg.includes('enotfound')) {
    return 'Could not reach the AI service due to a network issue. Please try again.';
  }
  return 'The AI service encountered an error. Please try again in a moment.';
}

// ── Core completions ──────────────────────────────────────────────────────────

/**
 * Plain-text chat completion.
 */
async function chat(systemPrompt, userMessage, maxTokens = 800) {
  const model = await resolveModel();
  const groq  = getGroq();
  const completion = await withTimeout(
    groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.7,
      max_tokens:  maxTokens,
    }),
    GROQ_TIMEOUT_MS,
    'AI chat'
  );
  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * JSON completion — instructs the model via prompt (Groq doesn't support
 * response_format: json_object across all models).
 */
async function chatJSON(systemPrompt, userMessage, maxTokens = 1000) {
  const model = await resolveModel();
  const groq  = getGroq();
  const completion = await withTimeout(
    groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\nYou MUST respond with valid JSON only. No explanation, no markdown, no code fences — just the raw JSON object.',
        },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
      max_tokens:  maxTokens,
    }),
    GROQ_TIMEOUT_MS,
    'AI JSON request'
  );
  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Parses JSON from AI response.
 * Handles markdown fences, preamble text, and trailing content.
 */
function parseJSON(text) {
  if (!text) throw new SyntaxError('Empty response from AI');

  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract first complete JSON object or array, ignoring surrounding text
  const objMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) cleaned = objMatch[1];

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

Keep responses concise, developer-friendly, and use markdown formatting where helpful.`;

  try {
    return await chat(system, message, 1024);
  } catch (err) {
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 2: Hackathon Idea Generator ──────────────────────────────────────
async function generateHackathonIdea({ domain, techStack, teamSize, difficulty, theme, problemArea }) {
  const system = `You are a hackathon mentor. Generate creative project ideas and return JSON.`;

  const userMsg = `Generate a hackathon idea:
Domain: ${domain} | Tech: ${techStack} | Size: ${teamSize} | Difficulty: ${difficulty} | Theme: ${theme}
Problem: ${problemArea}

Return this exact JSON structure:
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

  try {
    const raw = await chatJSON(system, userMsg, 1000);
    return parseJSON(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('The AI returned an unexpected response. Please try again.');
    }
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 3: Skill Gap Analyzer ────────────────────────────────────────────
async function analyzeSkillGap({ currentSkills, targetRole, experienceLevel }) {
  const system = `You are a tech career coach. Analyze skill gaps and return JSON.`;

  const userMsg = `Skill gap analysis:
Skills: ${currentSkills?.slice(0, 8).join(', ') || 'none'}
Target: ${targetRole} | Level: ${experienceLevel}

Return this exact JSON:
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

  try {
    const raw = await chatJSON(system, userMsg, 1000);
    return parseJSON(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('The AI returned an unexpected response. Please try again.');
    }
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 4: AI Team Recommendations ───────────────────────────────────────
async function aiTeamRecommendations({ currentUser, candidates }) {
  const system = `You are a team formation AI. Analyze developer compatibility and return JSON.`;

  const top = candidates.slice(0, 5);

  const userMsg = `Rate compatibility between user and each candidate (0-100).

User: ${currentUser.name} | Skills: ${currentUser.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${currentUser.experienceLevel}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Return this exact JSON:
{
  "results": [
    { "candidateIndex": 0, "compatibilityScore": 85, "matchingSkills": ["skill1"], "complementarySkills": ["skill2"], "suggestedRole": "string", "whyGoodMatch": "one sentence" }
  ]
}`;

  try {
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
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('The AI returned an unexpected response. Please try again.');
    }
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 5: AI Team-Mode Recommendations ──────────────────────────────────
async function aiTeamModeRecommendations({ teamName, requiredSkills, missingSkills, combinedMemberSkills, candidates }) {
  const system = `You are a team formation AI. Find candidates who fill missing skill gaps and return JSON.`;

  const top = candidates.slice(0, 5);

  const userMsg = `Team "${teamName}" needs: ${missingSkills.slice(0, 5).join(', ') || 'general skills'}
Has: ${combinedMemberSkills.slice(0, 5).join(', ') || 'none'}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Return this exact JSON:
{
  "results": [
    { "candidateIndex": 0, "compatibilityScore": 88, "skillsFulfilled": ["skill1"], "suggestedRole": "string", "whyGoodMatch": "one sentence", "teamImpact": "one sentence" }
  ]
}`;

  try {
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
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('The AI returned an unexpected response. Please try again.');
    }
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 6: Extract project details ───────────────────────────────────────
async function extractProjectDetails({ problemArea }) {
  const system = `You are a smart project details extractor for a hackathon platform.
Extract structured project information from a natural language description.
If a field cannot be determined, use sensible defaults.`;

  const userMsg = `Extract project details from this description:
"${problemArea}"

Return this exact JSON:
{
  "domain": "string (e.g. Healthcare, Education, Fintech, Productivity, General)",
  "techStack": ["tech1", "tech2"],
  "teamSize": "3-4",
  "difficulty": "intermediate",
  "theme": "string (e.g. HealthTech, EdTech, Open Innovation)"
}

Rules:
- difficulty must be one of: beginner, intermediate, advanced
- teamSize format: "3-4", "5-6", "1-2"`;

  try {
    const raw = await chatJSON(system, userMsg, 400);
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
  classifyGroqError,
};
