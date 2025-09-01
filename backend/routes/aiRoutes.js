const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const https = require('https');

const ChatSession = require('../models/ChatSession');
const { authenticateToken } = require('../middleware/authMiddleware');

//Optional proxy support
let HttpsProxyAgent;
try { HttpsProxyAgent = require('https-proxy-agent'); } catch { /* optional */ }


//Network helpers (proxy/DNS/timeout hardening)
function buildHttpsAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl && HttpsProxyAgent) {
    return new HttpsProxyAgent(proxyUrl);
  }
  return new https.Agent({ keepAlive: true });
}


//watsonx helpers
async function getWatsonxAccessToken(apiKey) {
  const agent = buildHttpsAgent();
  try {
    const response = await axios.post(
      'https://iam.cloud.ibm.com/identity/token',
      new URLSearchParams({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': apiKey,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: agent,
        timeout: 10000,
        family: 4,
      }
    );
    return response.data.access_token;
  } catch (err) {
    const code = err?.code;
    const status = err?.response?.status;
    const isDNS = code === 'ENOTFOUND' || code === 'EAI_AGAIN';
    const detail = isDNS
      ? 'DNS resolution failed for iam.cloud.ibm.com. Check internet/DNS/VPN or set HTTPS_PROXY.'
      : (status ? `IAM HTTP ${status}` : err?.message || 'Unknown IAM error');
    const wrapped = new Error(detail);
    wrapped.code = code;
    wrapped.isNetwork = !!isDNS;
    throw wrapped;
  }
}

async function callWatsonx({
  input,
  model_id = 'ibm/granite-3-8b-instruct',
  max_tokens = 1200,
  stop_sequences = [],
  temperature = 0.35
}) {
  const watsonxUrl = process.env.WATSONX_URL;
  const watsonxApiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;

  const accessToken = await getWatsonxAccessToken(watsonxApiKey);
  const agent = buildHttpsAgent();

  const response = await axios.post(
    `${watsonxUrl}/ml/v1/text/generation?version=2024-05-01`,
    {
      model_id,
      input,
      parameters: {
        max_new_tokens: max_tokens,
        temperature,
        top_p: 0.9,
        stop_sequences,
      },
      project_id: projectId
    },
    {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      httpsAgent: agent,
      timeout: 20000,
      family: 4,
    }
  );

  return response.data?.results?.[0]?.generated_text || '';
}

//System prompts
const BASE_SYSTEM = `You are a helpful, accurate travel assistant.
- Answer ONLY the next user turn.
- Do not include lines that begin with "User:", "Assistant:", or "System:".
- Be complete and specific. If the user asks for multi-day suggestions, cover ALL requested days.
- Prefer bullet points or short paragraphs when listing options.
- Tailor suggestions to any known constraints (budget, pace, dates, travelers, homeAirport).
- IMPORTANT: Do NOT produce an itinerary or any JSON unless the user EXPLICITLY asks to create/generate/make/plan an itinerary (or day-by-day plan) NOW. If the user is only providing details (like days, budget, "maybe somewhere in Asia"), ask focused follow-up questions or give suggestions instead.
- Never use placeholder tokens like [National Park 1], [Museum 1], [Destination City]. Use realistic names if known; otherwise use natural non-placeholder phrases (e.g., "a national park near La Fortuna").`;

function itinerarySystem({ days_hint, destination_hint }) {
  const daysLine = days_hint
    ? `- You MUST output exactly ${days_hint} day objects in the "days" array.\n- Ensure the title/description explicitly reflect a ${days_hint}-day plan.`
    : `- If the user did not specify days, choose a sensible length (3–5) and ensure the number of day objects in "days" matches the title/description.`;

  const destLine = destination_hint
    ? `- Destination hint: ${destination_hint}`
    : `- If destination is unclear, infer from context or use the user's stated destination.`;

  return `${BASE_SYSTEM}
If (and only if) the user explicitly asked for an itinerary, respond ONLY with STRICT JSON matching:
{
  "title": string,
  "description": string,
  "destination": string,
  "days": [
    { "notes": string, "activities": [ { "description": string, "location": string } ] }
  ]
}
Rules:
- Double quotes for all keys/strings.
- No trailing commas.
- Output JSON only, no extra text or markdown.
- "description" must be ≤ 500 characters.
- Each day's "activities" should be concrete and readable (no placeholders).
${daysLine}
${destLine}`.trim();
}

// Sanitizers & helpers
function sanitizeAssistantReply(text) {
  if (!text) return '';
  let out = String(text).replace(/\r/g, '');
  out = out.replace(/^\s*Assistant\s*:\s*/i, '');
  out = out.replace(/^\s*(Answer|Response|Reply)\s*:\s*/i, '');

  // Cut code fences / JSON blocks in non-itinerary replies
  const cuts = [
    out.indexOf('\n```'),
    out.indexOf('\nJSON:'),
    out.indexOf('\nJson:'),
    out.indexOf('\njson:')
  ].filter(i => i !== -1);
  if (cuts.length) out = out.slice(0, Math.min(...cuts));

  // Cut any role labels
  const roleIdx = out.search(/[\n\r]+(?:User|Assistant|System)\s*:/i);
  if (roleIdx !== -1) out = out.slice(0, roleIdx);

  // Drop trailing bare JSON block if tacked onto prose
  const lastBrace = out.lastIndexOf('{');
  if (lastBrace !== -1 && out.length - lastBrace < 300 && lastBrace > 40) {
    out = out.slice(0, lastBrace);
  }

  out = out
    .split('\n')
    .filter(line => !/^\s*(User|Assistant|System)\s*:/i.test(line))
    .join('\n');

  return out.trim();
}

function ensureNonEmpty(text, fallback) {
  const t = (text ?? '').toString().trim();
  return t.length ? t : fallback;
}

function extractLargestJSONObject(text) {
  if (!text) return null;
  const s = String(text);
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return s.slice(first, last + 1);
  }
  return null;
}
function tryParseJSONLoose(s) {
  if (!s) return null;
  let txt = String(s).trim();
  txt = txt.replace(/```[\s\S]*?```/g, m => m.replace(/```(json)?/i, '').replace(/```$/, ''));
  txt = txt.replace(/^\s*JSON\s*:\s*/i, '');
  const block = extractLargestJSONObject(txt);
  if (block) txt = block;
  try { return JSON.parse(txt); } catch { return null; }
}
function extractDaysHintFromText(text) {
  if (!text) return null;
  const m = String(text).match(/(\d+)\s*[- ]?day(s)?\b/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : null;
}

// Extra local check for "explicit request" phrasing
function hasExplicitItineraryRequest(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return /\b(create|make|generate|draft|plan|produce|build)\b.*\b(itinerary|day[-\s]?by[-\s]?day|travel plan|trip plan)\b/.test(t)
      || /\b(itinerary|day[-\s]?by[-\s]?day)\b.*\bplease\b/.test(t)
      || /\bturn (this|that|these|it) into (an )?itinerary\b/.test(t)
      || /\buse (this|that|these|the (ideas|suggestions)) to (create|make|generate)\b.*\bitinerary\b/.test(t);
}


async function repairItineraryJSON(rawReply, { days_hint, destination_hint }) {
  const prompt = [
    itinerarySystem({ days_hint, destination_hint }),
    '',
    'Convert the following content into STRICT JSON that follows the schema and rules above.',
    'Output JSON only (no explanations):',
    '',
    String(rawReply)
  ].join('\n');

  const fixed = await callWatsonx({
    input: prompt,
    max_tokens: 1500,
    stop_sequences: [],
    temperature: 0
  });
  return tryParseJSONLoose(fixed);
}

// Prompt builderS
function buildContextBlock(summary, messages, maxTurns = 14) {
  const recent = (messages || []).slice(-maxTurns).map(m => {
    if (m.role === 'user') return `- The user said: ${m.content}`;
    if (m.role === 'assistant') return `- You previously replied: ${m.content}`;
    return `- Note: ${m.content}`;
  }).join('\n');

  const head = [
    `System: ${BASE_SYSTEM}`,
    summary ? `System: Conversation summary so far:\n${summary}` : null,
    recent ? `Context:\n${recent}` : null,
  ].filter(Boolean).join('\n\n');

  return head;
}

function buildGenerationPrompt({ systemPrompt, summary, messages, extraInstruction }) {
  const head = [
    `System: ${systemPrompt}`.trim(),
    summary ? `System: Conversation summary so far:\n${summary}` : null,
  ].filter(Boolean).join('\n\n');

  const recent = (messages || []).slice(-14).map(m => {
    if (m.role === 'user') return `- The user said: ${m.content}`;
    if (m.role === 'assistant') return `- You previously replied: ${m.content}`;
    return `- Note: ${m.content}`;
  }).join('\n');

  const instr = `Instruction: Respond ONLY to the latest user message. Output plain prose (no role labels) OR strict JSON if instructed. Provide a complete answer.`;

  return [head, recent ? `Context:\n${recent}` : null, extraInstruction || null, instr]
    .filter(Boolean).join('\n\n');
}

// Intent Classifier (explicit)
async function classifyIntentLLM(session, latestUserMessage) {
  const context = buildContextBlock(session.summary, session.messages, 12);
  const classifierPrompt = [
    context,
    '',
    'You are an INTENT CLASSIFIER. Decide what the latest user message is asking.',
    'Return STRICT JSON ONLY with this schema:',
    `{
  "intent": "ITINERARY_CREATE" | "ITINERARY_UPDATE" | "GENERAL",
  "explicit_request": boolean,
  "ready_to_create": boolean,
  "missing": string[],            // e.g., ["destination","dates"]
  "create_type": "NEW" | "FROM_PRIOR_SUGGESTIONS" | null,
  "use_prior_context": boolean,
  "days_hint": number | null,
  "destination_hint": string | null,
  "confidence": number
}`,
    'Label "ITINERARY_CREATE" **only if** the LATEST user message explicitly asks to create/make/generate/draft/plan an itinerary (or day-by-day plan) NOW.',
    'If the user merely provides details (e.g., "6 days", "maybe somewhere in Asia"), do NOT mark ITINERARY_CREATE. Mark GENERAL and set "missing" appropriately.',
    'Set "ready_to_create" true only if enough info is provided to generate a coherent itinerary (at least a destination; days if specified by the user).',
    'Extract days and destination if clearly stated.',
    '',
    `Latest user message:\n"${latestUserMessage}"`
  ].join('\n');

  const raw = await callWatsonx({
    input: classifierPrompt,
    max_tokens: 320,
    temperature: 0,
    stop_sequences: ['\nUser:', '\nAssistant:', '\nSystem:'],
  });

  const parsed = (() => {
    const loose = tryParseJSONLoose(raw);
    if (loose && loose.intent) return loose;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  if (parsed && parsed.intent) return parsed;

  // conservative fallback (explicit phrase)
  return {
    intent: hasExplicitItineraryRequest(latestUserMessage) ? 'ITINERARY_CREATE' : 'GENERAL',
    explicit_request: hasExplicitItineraryRequest(latestUserMessage),
    ready_to_create: false,
    missing: [],
    create_type: null,
    use_prior_context: false,
    days_hint: extractDaysHintFromText(latestUserMessage),
    destination_hint: null,
    confidence: 0.4
  };
}

//Suggestions extractor (for FROM_PRIOR_SUGGESTIONS)
async function extractSuggestionsFromRecent(session) {
  const recent = (session.messages || []).slice(-18).map(m => {
    const who = m.role === 'assistant' ? 'Assistant' : 'User';
    return `${who}: ${m.content}`;
  }).join('\n');

  const prompt = [
    'System: From the recent conversation, extract concise bullet suggestions the user wants included in an itinerary (attractions, neighborhoods, restaurants, constraints like pace/budget).',
    'Return STRICT JSON only in this schema:',
    '{ "suggestions": string[], "constraints": string[] }',
    'Keep it under 12 total items.',
    '',
    'Conversation:',
    recent
  ].join('\n');

  const raw = await callWatsonx({ input: prompt, max_tokens: 300, temperature: 0 });
  const parsed = tryParseJSONLoose(raw);
  if (parsed && parsed.suggestions) return parsed;
  try { return JSON.parse(raw); } catch { return { suggestions: [], constraints: [] }; }
}

// Summarizer
async function summarizeIfNeeded(session) {
  const MAX_MESSAGES_BEFORE_SUMMARY = 50;
  if ((session.messages?.length || 0) < MAX_MESSAGES_BEFORE_SUMMARY) return;

  const input = [
    'System: Summarize the following conversation into 8-12 bullet points focusing on user preferences, destinations discussed, constraints (budget, pace, travelers, dates, homeAirport), and key decisions.',
    ...session.messages.slice(0, -20).map(m => `${m.role === 'assistant' ? 'Assistant reply' : 'User message'}: ${m.content}`)
  ].join('\n');

  const summary = await callWatsonx({ input, max_tokens: 500, stop_sequences: [], temperature: 0 });
  session.summary = (session.summary ? (session.summary + '\n') : '') + String(summary || '').trim();
  session.messages = session.messages.slice(-40);
}

router.use(authenticateToken);

//check connectivity
router.get('/health/ai', async (req, res) => {
  try {
    await getWatsonxAccessToken(process.env.WATSONX_API_KEY);
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

//Session management
router.post('/sessions/new', async (req, res) => {
  try {
    const userIdStr = req.user?.userId;
    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(400).json({ error: 'Invalid user id in token' });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);
    const s = await ChatSession.create({ userId, title: 'Travel chat' });
    return res.json({ sessionId: s._id.toString() });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create session', details: e.message });
  }
});

//Chat (explicit-only itinerary creation)
router.post('/chat', async (req, res) => {
  try {
    const userIdStr = req.user?.userId;
    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(400).json({ error: 'Invalid user id in token' });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    const { sessionId, message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) return res.status(404).json({ error: 'Session not found' });
    } else {
      session = await ChatSession.create({ userId, title: 'Travel chat' });
    }

    // Append user message
    session.messages.push({ role: 'user', content: message });

    // Intent classification
    const cls = await classifyIntentLLM(session, message);

    // Gate itinerary creation: require explicit request + readiness
    const explicitLocal = hasExplicitItineraryRequest(message);
    const explicit = !!(cls.explicit_request || explicitLocal);
    const ready = cls.ready_to_create !== false; // default to false if classifier says it's not ready

    let expectingItinerary = cls.intent === 'ITINERARY_CREATE' && explicit && ready;

    // Build system prompt & optional extra instruction
    let systemPrompt = BASE_SYSTEM;
    let extraInstruction = '';

    if (!expectingItinerary) {
      // Ask focused follow-ups or give suggestions; never create an itinerary here.
      const missingList = (cls.missing && cls.missing.length) ? cls.missing.join(', ') : 'destination, dates, budget, pace, interests';
      extraInstruction =
        `Do NOT create an itinerary. If the user is undecided, suggest 3–6 concrete destination ideas with 1-line "why". ` +
        `If information is incomplete, ask up to 2 focused follow-up questions to obtain: ${missingList}.`;
    } else {
      // Prepare itinerary prompt with hints and (optionally) prior suggestions
      let directives = { days_hint: cls.days_hint || extractDaysHintFromText(message), destination_hint: cls.destination_hint || null };
      let suggestionBlock = '';
      if (cls.use_prior_context || cls.create_type === 'FROM_PRIOR_SUGGESTIONS') {
        const extracted = await extractSuggestionsFromRecent(session);
        const sugg = (extracted?.suggestions || []).slice(0, 8).map(s => `- ${s}`).join('\n');
        const cons = (extracted?.constraints || []).slice(0, 6).map(s => `- ${s}`).join('\n');
        suggestionBlock = [
          sugg ? `Incorporate these suggestions when appropriate:\n${sugg}` : '',
          cons ? `Respect these constraints when possible:\n${cons}` : ''
        ].filter(Boolean).join('\n\n');
      }
      systemPrompt = [
        itinerarySystem(directives),
        suggestionBlock ? `\n${suggestionBlock}` : ''
      ].join('\n');
    }

    const prompt = buildGenerationPrompt({
      systemPrompt,
      summary: session.summary,
      messages: session.messages,
      extraInstruction
    });

    // Prevent fake transcripts in normal chat
    const stopSeqs = expectingItinerary
      ? []
      : ['\nUser:', '\nuser:', '\nUSER:', 'User:', 'user:', 'USER:'];

    let reply = await callWatsonx({
      input: prompt,
      max_tokens: expectingItinerary ? 1800 : 1200,
      stop_sequences: stopSeqs,
      temperature: expectingItinerary ? 0.25 : 0.35
    });

    let itineraryJSON = null;

    if (expectingItinerary) {
      itineraryJSON = tryParseJSONLoose(reply);
      if (!itineraryJSON) {
        itineraryJSON = await repairItineraryJSON(reply, {
          days_hint: cls.days_hint || extractDaysHintFromText(message),
          destination_hint: cls.destination_hint || null
        });
      }
      if (itineraryJSON) {
        reply = JSON.stringify(itineraryJSON);
      } else {
        reply = sanitizeAssistantReply(reply);
        reply = ensureNonEmpty(
          reply,
          'I tried to generate an itinerary but ended up with no usable content. Please restate your request (e.g., "Create a 6-day itinerary for Japan with a focus on food and culture").'
        );
        // Since JSON failed, don’t treat this as an itinerary message.
        expectingItinerary = false;
      }
    } else {
      reply = sanitizeAssistantReply(reply);
      reply = ensureNonEmpty(
        reply,
        'Got it. Could you share a bit more detail—like destination and dates—so I can help further?'
      );
    }

    // Append assistant reply
    session.messages.push({ role: 'assistant', content: reply });

    await summarizeIfNeeded(session);
    await session.save();

    res.json({
      sessionId: session._id.toString(),
      reply,
      expectingItinerary,
      itineraryValid: !!itineraryJSON,
      classification: cls
    });
  } catch (err) {
    const isNet = err?.isNetwork || /ENOTFOUND|EAI_AGAIN/i.test(err?.message || '');
    console.error('AI chat error', err);
    return res
      .status(isNet ? 503 : 500)
      .json({
        error: isNet ? 'AI service network error' : 'AI chat failed',
        details: err.message
      });
  }
});

// List / Get / Update sessions
router.get('/sessions', async (req, res) => {
  const userIdStr = req.user?.userId;
  if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
    return res.status(400).json({ error: 'Invalid user id in token' });
  }
  const userId = new mongoose.Types.ObjectId(userIdStr);

  const sessions = await ChatSession.find({ userId, archived: false })
    .select('_id title updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json(sessions);
});

router.get('/sessions/:id', async (req, res) => {
  const userIdStr = req.user?.userId;
  if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
    return res.status(400).json({ error: 'Invalid user id in token' });
  }
  const userId = new mongoose.Types.ObjectId(userIdStr);

  const s = await ChatSession.findOne({ _id: req.params.id, userId });
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

router.patch('/sessions/:id', async (req, res) => {
  const userIdStr = req.user?.userId;
  if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
    return res.status(400).json({ error: 'Invalid user id in token' });
  }
  const userId = new mongoose.Types.ObjectId(userIdStr);

  const { title, archived } = req.body;
  const s = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, userId },
    { ...(title ? { title } : {}), ...(typeof archived === 'boolean' ? { archived } : {}) },
    { new: true }
  ).select('_id title archived updatedAt');

  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

module.exports = router;