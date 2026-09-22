/**
 * ai.service.js
 *
 * Provider strategy (in order of preference):
 *
 * 1. Gemini Flash (GEMINI_API_KEY) — primary
 *    - Gemini 1.5 Flash: free tier, 15 RPM, 1M tokens/day
 *    - Reliable JSON output, no reasoning token drain
 *
 * 2. Groq (GROQ_API_KEY) — fallback
 *    - Available models on this account: openai/gpt-oss-20b, qwen/qwen3.8-27b
 *    - Both are reasoning models: need high max_tokens (4000+) so thinking
 *      tokens don't consume the entire budget before the actual response
 *    - qwen3.8-27b preferred over gpt-oss-20b (more predictable JSON output)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

// ── Clients (lazy-init) ───────────────────────────────────────────────────────
let geminiClient = null;
let groqClient   = null;

function getGemini() {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

function getGroq() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// ── Provider detection ────────────────────────────────────────────────────────
function hasGemini() { return !!process.env.GEMINI_API_KEY; }
function hasGroq()   { return !!process.env.GROQ_API_KEY; }

// ── Groq model discovery (cached) ─────────────────────────────────────────────
const GROQ_MODEL_PREFERENCE = [
  'qwen/qwen3.8-27b',      // reasoning model — better JSON reliability than gpt-oss-20b
  'openai/gpt-oss-20b',    // reasoning model — fallback
  'openai/gpt-oss-120b',   // larger reasoning model
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
];

let resolvedGroqModel = null;

async function resolveGroqModel() {
  if (resolvedGroqModel) return resolvedGroqModel;
  const { data: models } = await getGroq().models.list();
  const ids = new Set(models.map(m => m.id));
  console.log('🔍 Groq models:', [...ids].join(', '));
  for (const m of GROQ_MODEL_PREFERENCE) {
    if (ids.has(m)) {
      resolvedGroqModel = m;
      console.log(`🤖 Groq model selected: ${m}`);
      return m;
    }
  }
  // Last resort: first non-audio model
  const fallback = models.find(m => !m.id.includes('whisper') && !m.id.includes('guard') && !m.id.includes('orpheus'));
  if (fallback) { resolvedGroqModel = fallback.id; return fallback.id; }
  throw new Error('No usable Groq model found');
}

// ── Timeout helper ────────────────────────────────────────────────────────────
const TIMEOUT_MS = 28000;

function withTimeout(promise, label = 'AI') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), TIMEOUT_MS);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

// ── Error classifier ──────────────────────────────────────────────────────────
function classifyError(err) {
  const msg = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || 0;
  if (msg.includes('api key') || msg.includes('api_key') || status === 401)
    return 'The AI service has a configuration issue. Please contact support.';
  if (msg.includes('rate') || status === 429)
    return 'The AI service is busy. Please wait a moment and try again.';
  if (msg.includes('timed out') || msg.includes('timeout'))
    return 'The AI request took too long. Please try again.';
  if (msg.includes('quota') || msg.includes('billing'))
    return 'AI quota exceeded for today. Please try again later.';
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('unavailable')))
    return 'The AI model is temporarily unavailable. Please try again.';
  return 'The AI service encountered an error. Please try again.';
}

// ── JSON parser ───────────────────────────────────────────────────────────────
// Both Gemini and Groq reasoning models may wrap output in fences or add preamble.
function parseJSON(text) {
  if (!text || !text.trim()) throw new SyntaxError('Empty AI response');

  let s = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')  // strip Qwen/GPT-OSS reasoning blocks
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract first JSON object or array, ignoring any surrounding prose
  const m = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) s = m[1];

  return JSON.parse(s);
}

// ── Core: Gemini plain text ───────────────────────────────────────────────────
async function geminiChat(systemPrompt, userMessage, maxTokens = 1024) {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  });
  const result = await withTimeout(model.generateContent(userMessage), 'Gemini');
  return result.response.text().trim();
}

// ── Core: Gemini JSON ─────────────────────────────────────────────────────────
async function geminiJSON(systemPrompt, userMessage, maxTokens = 2048) {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4,
      responseMimeType: 'application/json',  // Gemini native JSON mode — no fences, no preamble
    },
  });
  const result = await withTimeout(model.generateContent(userMessage), 'Gemini JSON');
  return result.response.text().trim();
}

// ── Core: Groq plain text ─────────────────────────────────────────────────────
async function groqChat(systemPrompt, userMessage, maxTokens = 1024) {
  const model = await resolveGroqModel();
  const c = await withTimeout(
    getGroq().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.7,
      // Reasoning models (gpt-oss-20b, qwen3) consume tokens internally for <think> blocks.
      // We need a large budget so the actual response doesn't get cut off.
      max_tokens: Math.max(maxTokens * 4, 4000),
    }),
    'Groq'
  );
  const content = c.choices[0]?.message?.content || '';
  // Strip any leaked reasoning blocks
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// ── Core: Groq JSON ───────────────────────────────────────────────────────────
async function groqJSON(systemPrompt, userMessage, maxTokens = 2000) {
  const model = await resolveGroqModel();
  const c = await withTimeout(
    getGroq().chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\nIMPORTANT: Output ONLY the raw JSON object. No explanation, no markdown, no code fences.',
        },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      // Must be large: reasoning models think internally before outputting JSON.
      // Too small → empty output → SyntaxError. 6000 is safe for all features.
      max_tokens: Math.max(maxTokens * 3, 6000),
    }),
    'Groq JSON'
  );
  const content = c.choices[0]?.message?.content || '';
  if (!content.trim()) throw new SyntaxError('Empty AI response — reasoning model used all tokens on thinking. Retrying with fallback.');
  return content;
}

// ── Unified API (tries Gemini first, falls back to Groq) ─────────────────────
async function chat(systemPrompt, userMessage, maxTokens = 1024) {
  if (hasGemini()) {
    try { return await geminiChat(systemPrompt, userMessage, maxTokens); }
    catch (e) { console.warn('Gemini chat failed, trying Groq:', e.message); }
  }
  if (hasGroq()) return await groqChat(systemPrompt, userMessage, maxTokens);
  throw new Error('No AI provider configured. Please set GEMINI_API_KEY or GROQ_API_KEY.');
}

async function chatJSON(systemPrompt, userMessage, maxTokens = 2048) {
  if (hasGemini()) {
    try {
      const raw = await geminiJSON(systemPrompt, userMessage, maxTokens);
      return raw;
    } catch (e) { console.warn('Gemini JSON failed, trying Groq:', e.message); }
  }
  if (hasGroq()) return await groqJSON(systemPrompt, userMessage, maxTokens);
  throw new Error('No AI provider configured. Please set GEMINI_API_KEY or GROQ_API_KEY.');
}

// ── Feature 1: Team Chat Assistant ───────────────────────────────────────────
async function teamChatAssistant({ message, teamName, teamSkills, projectDescription }) {
  const system = `You are an AI assistant inside TeamForge, a team collaboration platform.
Team: "${teamName}" | Skills: ${teamSkills?.join(', ') || 'not specified'} | Project: ${projectDescription || 'general'}.
Help with coding, planning, tech stacks, hackathon ideas, and architecture. Be concise and developer-friendly. Use markdown.`;
  try {
    return await chat(system, message, 1024);
  } catch (err) { throw new Error(classifyError(err)); }
}

// ── Feature 2: Hackathon Idea Generator ──────────────────────────────────────
async function generateHackathonIdea({ domain, techStack, teamSize, difficulty, theme, problemArea }) {
  const system = `You are a hackathon mentor. Generate a creative project idea as a JSON object.`;
  const userMsg = `Generate a hackathon idea:
Domain: ${domain} | Tech: ${techStack} | Team: ${teamSize} | Difficulty: ${difficulty} | Theme: ${theme}
Problem: ${problemArea}

Return this JSON structure:
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
    const raw = await chatJSON(system, userMsg, 2048);
    return parseJSON(raw);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyError(err));
  }
}

// ── Feature 3: Skill Gap Analyzer ────────────────────────────────────────────
async function analyzeSkillGap({ currentSkills, targetRole, experienceLevel }) {
  const system = `You are a tech career coach. Analyze skill gaps and return a JSON object.`;
  const userMsg = `Analyze skill gap:
Current skills: ${currentSkills?.slice(0, 8).join(', ') || 'none'}
Target role: ${targetRole} | Level: ${experienceLevel}

Return this JSON:
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
    const raw = await chatJSON(system, userMsg, 2048);
    return parseJSON(raw);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyError(err));
  }
}

// ── Feature 4: AI Team Recommendations ───────────────────────────────────────
async function aiTeamRecommendations({ currentUser, candidates }) {
  const system = `You are a team formation AI. Rate compatibility and return a JSON object.`;
  const top = candidates.slice(0, 5);
  const userMsg = `Rate compatibility (0-100) between this user and each candidate.

User: ${currentUser.name} | Skills: ${currentUser.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${currentUser.experienceLevel}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Return:
{"results":[{"candidateIndex":0,"compatibilityScore":85,"matchingSkills":["skill1"],"complementarySkills":["skill2"],"suggestedRole":"string","whyGoodMatch":"one sentence"}]}`;
  try {
    const raw = await chatJSON(system, userMsg, 1024);
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
        },
      };
    }).sort((a, b) => b.compatibility.score - a.compatibility.score);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyError(err));
  }
}

// ── Feature 5: AI Team-Mode Recommendations ──────────────────────────────────
async function aiTeamModeRecommendations({ teamName, requiredSkills, missingSkills, combinedMemberSkills, candidates }) {
  const system = `You are a team formation AI. Find candidates that fill skill gaps. Return a JSON object.`;
  const top = candidates.slice(0, 5);
  const userMsg = `Team "${teamName}" needs: ${missingSkills.slice(0, 5).join(', ') || 'general skills'}
Has: ${combinedMemberSkills.slice(0, 5).join(', ') || 'none'}

Candidates:
${top.map((c, i) => `${i}. ${c.name} | Skills: ${c.skills?.slice(0, 5).join(', ') || 'none'} | Exp: ${c.experienceLevel}`).join('\n')}

Return:
{"results":[{"candidateIndex":0,"compatibilityScore":88,"skillsFulfilled":["skill1"],"suggestedRole":"string","whyGoodMatch":"one sentence","teamImpact":"one sentence"}]}`;
  try {
    const raw = await chatJSON(system, userMsg, 1024);
    const parsed = parseJSON(raw);
    const aiResults = Array.isArray(parsed) ? parsed : (parsed.results || []);
    return top.map((candidate, i) => {
      const ai = aiResults.find(r => r.candidateIndex === i) || aiResults[i] || {};
      return {
        user: candidate,
        compatibility: {
          score:           ai.compatibilityScore || 50,
          skillsFulfilled: ai.skillsFulfilled || [],
          suggestedRole:   ai.suggestedRole || 'Team Member',
          whyGoodMatch:    ai.whyGoodMatch || 'Complements team skills',
          teamImpact:      ai.teamImpact || '',
          mode:            'team',
        },
      };
    }).sort((a, b) => b.compatibility.score - a.compatibility.score);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The AI returned an unexpected response. Please try again.');
    throw new Error(classifyError(err));
  }
}

// ── Feature 6: Extract project details ───────────────────────────────────────
async function extractProjectDetails({ problemArea }) {
  const system = `Extract structured project info from a description. Return a JSON object.`;
  const userMsg = `Extract from: "${problemArea}"
Return: {"domain":"General","techStack":[],"teamSize":"3-4","difficulty":"intermediate","theme":"Open Innovation"}
Rules: difficulty = beginner|intermediate|advanced`;
  try {
    const raw = await chatJSON(system, userMsg, 512);
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
  classifyError,
};
