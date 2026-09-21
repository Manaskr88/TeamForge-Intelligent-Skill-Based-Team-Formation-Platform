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

// ── Error classifier (defined first — used by resolveModel) ──────────────────
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

// ── Model selection ───────────────────────────────────────────────────────────
// Confirmed available on the current Groq free account (verified 2026):
//   openai/gpt-oss-20b, openai/gpt-oss-120b, qwen/qwen3.8-27b
// Llama models (llama-3.1-8b-instant etc.) are Enterprise-only on this account.
// We probe /models at first use and pick the best available model automatically.
const MODEL_PREFERENCE = [
  'openai/gpt-oss-20b',                         // fast reasoning, 1K RPM — primary
  'openai/gpt-oss-120b',                        // larger — fallback
  'qwen/qwen3.8-27b',                           // Qwen — second fallback
  'meta-llama/llama-4-scout-17b-16e-instruct',  // if available
  'llama-3.3-70b-versatile',                    // Enterprise accounts
  'llama-3.1-8b-instant',                       // Enterprise accounts
  'llama3-70b-8192',                            // legacy id
  'llama3-8b-8192',                             // legacy id
  'moonshotai/kimi-k2-instruct',
  'gemma2-9b-it',
];

let resolvedModel = null; // cached after first discovery

async function resolveModel() {
  if (resolvedModel) return resolvedModel;

  try {
    const groq = getGroq();
    const { data: models } = await groq.models.list();
    const availableIds = new Set(models.map(m => m.id));
    console.log('🔍 Groq models available:', [...availableIds].join(', '));

    for (const candidate of MODEL_PREFERENCE) {
      if (availableIds.has(candidate)) {
        resolvedModel = candidate;
        console.log(`🤖 AI model selected: ${resolvedModel}`);
        return resolvedModel;
      }
    }

    // None of our preferences — use first non-audio, non-guard model
    const firstChat = models.find(m =>
      !m.id.includes('whisper') &&
      !m.id.includes('guard') &&
      !m.id.includes('orpheus')
    );
    if (firstChat) {
      resolvedModel = firstChat.id;
      console.log(`🤖 AI model fallback: ${resolvedModel}`);
      return resolvedModel;
    }

    throw new Error('No usable chat model found on this Groq account');
  } catch (err) {
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

// ── JSON parser ───────────────────────────────────────────────────────────────
// openai/gpt-oss-20b is a reasoning model — it emits <think>...</think> blocks
// before the actual response. We strip those plus any markdown fences.
function parseJSON(text) {
  if (!text) throw new SyntaxError('Empty response from AI');

  let cleaned = text
    // Strip reasoning/thinking blocks (gpt-oss-20b, Qwen3 reasoning mode)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Strip markdown code fences
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract first complete JSON object or array, ignoring surrounding text
  const objMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) cleaned = objMatch[1];

  return JSON.parse(cleaned);
}

// ── Core completions ──────────────────────────────────────────────────────────

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

// JSON completion — instructs via prompt (Groq doesn't support response_format across all models)
async function chatJSON(systemPrompt, userMessage, maxTokens = 1000) {
  const model = await resolveModel();
  const groq  = getGroq();
  const completion = await withTimeout(
    groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\nIMPORTANT: Respond with valid JSON only. No explanation, no markdown fences, no <think> blocks — output the raw JSON object and nothing else.',
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

// ── Feature 1: Team Chat AI Assistant ────────────────────────────────────────
async function teamChatAssistant({ message, teamName, teamSkills, projectDescription }) {
  const system = `You are an AI assistant embedded inside a team collaboration platform called TeamForge.
You are helping the team "${teamName}".
Team skills: ${teamSkills?.join(', ') || 'not specified'}.
Project context: ${projectDescription || 'general development project'}.
Help with coding, planning, tech stack suggestions, hackathon ideas, and architecture.
Keep responses concise and developer-friendly. Use markdown where helpful.`;

  try {
    return await chat(system, message, 1024);
  } catch (err) {
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 2: Hackathon Idea Generator ──────────────────────────────────────
async function generateHackathonIdea({ domain, techStack, teamSize, difficulty, theme, problemArea }) {
  const system = `You are a hackathon mentor. Generate a creative project idea and return ONLY a JSON object.`;

  const userMsg = `Generate a hackathon idea for:
Domain: ${domain} | Tech: ${techStack} | Team: ${teamSize} | Difficulty: ${difficulty} | Theme: ${theme}
Problem: ${problemArea}

Output this JSON object (no other text):
{"projectName":"","tagline":"","problemStatement":"","solution":"","coreFeatures":["","","","",""],"techStack":["","",""],"uniqueSellingPoint":"","monetizationIdea":"","futureScope":"","implementationRoadmap":[{"phase":"Phase 1","duration":"Day 1","tasks":["",""]},{"phase":"Phase 2","duration":"Day 2","tasks":["",""]},{"phase":"Phase 3","duration":"Day 3","tasks":["",""]}],"teamRoles":[{"role":"Frontend Developer","responsibilities":""},{"role":"Backend Developer","responsibilities":""},{"role":"UI/UX Designer","responsibilities":""}],"estimatedImpact":"","difficulty":"${difficulty}"}`;

  try {
    const raw = await chatJSON(system, userMsg, 1000);
    return parseJSON(raw);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 3: Skill Gap Analyzer ────────────────────────────────────────────
async function analyzeSkillGap({ currentSkills, targetRole, experienceLevel }) {
  const system = `You are a tech career coach. Analyze skill gaps and return ONLY a JSON object.`;

  const userMsg = `Skill gap analysis for:
Skills: ${currentSkills?.slice(0, 8).join(', ') || 'none'} | Target: ${targetRole} | Level: ${experienceLevel}

Output this JSON object (no other text):
{"targetRole":"${targetRole}","overallReadiness":45,"currentStrengths":["","",""],"missingSkills":[{"skill":"","priority":"high","reason":""}],"learningRoadmap":[{"week":"Week 1-2","focus":"","resources":["",""],"goal":""},{"week":"Week 3-4","focus":"","resources":["",""],"goal":""},{"week":"Week 5-8","focus":"","resources":["",""],"goal":""},{"week":"Week 9-12","focus":"","resources":["",""],"goal":""}],"recommendedProjects":[{"name":"","description":"","skills":["",""]}],"interviewTopics":["","","","",""],"certifications":[{"name":"","provider":"","priority":"high"}],"prioritySkills":["","",""],"timelineToJobReady":"","salaryRange":"","jobMarketDemand":"high"}`;

  try {
    const raw = await chatJSON(system, userMsg, 1000);
    return parseJSON(raw);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 4: AI Team Recommendations ───────────────────────────────────────
async function aiTeamRecommendations({ currentUser, candidates }) {
  const system = `You are a team formation AI. Rate developer compatibility and return ONLY a JSON object.`;

  const top = candidates.slice(0, 5);

  const userMsg = `Rate compatibility (0-100) between user and each candidate.

User: ${currentUser.name} | Skills: ${currentUser.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${currentUser.experienceLevel}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Output this JSON object (no other text):
{"results":[{"candidateIndex":0,"compatibilityScore":85,"matchingSkills":[""],"complementarySkills":[""],"suggestedRole":"","whyGoodMatch":""}]}`;

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
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 5: AI Team-Mode Recommendations ──────────────────────────────────
async function aiTeamModeRecommendations({ teamName, requiredSkills, missingSkills, combinedMemberSkills, candidates }) {
  const system = `You are a team formation AI. Find candidates filling skill gaps and return ONLY a JSON object.`;

  const top = candidates.slice(0, 5);

  const userMsg = `Team "${teamName}" needs: ${missingSkills.slice(0, 5).join(', ') || 'general skills'}
Has: ${combinedMemberSkills.slice(0, 5).join(', ') || 'none'}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Output this JSON object (no other text):
{"results":[{"candidateIndex":0,"compatibilityScore":88,"skillsFulfilled":[""],"suggestedRole":"","whyGoodMatch":"","teamImpact":""}]}`;

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
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyGroqError(err));
  }
}

// ── Feature 6: Extract project details ───────────────────────────────────────
async function extractProjectDetails({ problemArea }) {
  const system = `Extract project details from a description and return ONLY a JSON object.`;

  const userMsg = `Extract details from: "${problemArea}"

Output this JSON (no other text):
{"domain":"General","techStack":[],"teamSize":"3-4","difficulty":"intermediate","theme":"Open Innovation"}

Rules: difficulty = beginner|intermediate|advanced, teamSize format = "3-4"`;

  try {
    const raw = await chatJSON(system, userMsg, 300);
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
