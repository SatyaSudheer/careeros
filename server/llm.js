// Provider-agnostic LLM layer — bring your own key.
//
// Supported providers:
//   anthropic — Claude via official SDK (native structured outputs)
//   openai    — OpenAI chat completions (json_schema response format)
//   gemini    — Google Gemini generateContent (responseSchema)
//   custom    — any OpenAI-compatible endpoint (Ollama, OpenRouter, Groq, LM Studio…)
//
// Configuration lives in the app_settings table (set via the UI) with
// environment variables as fallback (ANTHROPIC_API_KEY / OPENAI_API_KEY /
// GEMINI_API_KEY). The key never leaves the server: API responses only carry
// a has_key flag and a …last4 hint.

const db = require('./db');

const PROVIDERS = {
  anthropic: { label: 'Anthropic Claude', defaultModel: 'claude-opus-4-8', envKey: 'ANTHROPIC_API_KEY' },
  openai:    { label: 'OpenAI',           defaultModel: 'gpt-4o',          envKey: 'OPENAI_API_KEY' },
  gemini:    { label: 'Google Gemini',    defaultModel: 'gemini-2.5-flash', envKey: 'GEMINI_API_KEY' },
  custom:    { label: 'OpenAI-compatible (Ollama, OpenRouter…)', defaultModel: '', envKey: '' },
};

// ── Settings ──────────────────────────────────────────────────────────────────

function readSetting(key) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function writeSetting(key, value) {
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value ?? ''));
}

function getAiSettings() {
  const provider = PROVIDERS[readSetting('ai_provider')] ? readSetting('ai_provider') : 'anthropic';
  const def = PROVIDERS[provider];
  let apiKey = readSetting('ai_api_key');
  if (!apiKey && def.envKey) apiKey = process.env[def.envKey] || '';
  return {
    provider,
    apiKey,
    model: readSetting('ai_model') || def.defaultModel,
    baseUrl: readSetting('ai_base_url') || '',
  };
}

function saveAiSettings({ provider, api_key, model, base_url } = {}) {
  if (provider != null) {
    writeSetting('ai_provider', PROVIDERS[provider] ? provider : 'anthropic');
    // Model defaults differ per provider — clear a stale model unless one is being set
    if (model == null) writeSetting('ai_model', '');
  }
  // api_key: undefined/'' = keep existing, null = clear, non-empty string = replace
  if (api_key === null) writeSetting('ai_api_key', '');
  else if (typeof api_key === 'string' && api_key.trim()) writeSetting('ai_api_key', api_key.trim());
  if (model != null) writeSetting('ai_model', String(model).trim());
  if (base_url != null) writeSetting('ai_base_url', String(base_url).trim());
}

function aiConfigured() {
  const s = getAiSettings();
  if (s.provider === 'custom') return Boolean(s.baseUrl && s.model); // local endpoints often need no key
  return Boolean(s.apiKey);
}

function publicSettings() {
  const s = getAiSettings();
  return {
    provider: s.provider,
    model: s.model,
    base_url: s.baseUrl,
    has_key: Boolean(s.apiKey),
    key_hint: s.apiKey ? `…${s.apiKey.slice(-4)}` : '',
    configured: aiConfigured(),
    providers: Object.entries(PROVIDERS).map(([key, p]) => ({ key, label: p.label, default_model: p.defaultModel })),
  };
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch {}
  const fenced = String(text).match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const start = String(text).indexOf('{');
  const end = String(text).lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(String(text).slice(start, end + 1));
  throw new Error('Model did not return valid JSON');
}

function schemaPrompt(system, schema) {
  return `${system}\n\nRespond ONLY with a single JSON object matching this JSON Schema — no markdown fences, no commentary:\n${JSON.stringify(schema)}`;
}

// Gemini's responseSchema is an OpenAPI subset — strip unsupported keywords
function stripUnsupported(schema) {
  if (Array.isArray(schema)) return schema.map(stripUnsupported);
  if (schema && typeof schema === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === 'additionalProperties') continue;
      out[k] = stripUnsupported(v);
    }
    return out;
  }
  return schema;
}

// ── Providers ─────────────────────────────────────────────────────────────────

async function anthropicJSON(s, { system, user, schema, maxTokens }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: s.apiKey });
  try {
    const response = await client.messages.create({
      model: s.model,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema } },
    });
    const block = response.content.find(b => b.type === 'text');
    return JSON.parse(block.text);
  } catch (err) {
    // Older Claude models don't support adaptive thinking / structured outputs
    if (err.status !== 400) throw err;
    const response = await client.messages.create({
      model: s.model,
      max_tokens: maxTokens,
      system: schemaPrompt(system, schema),
      messages: [{ role: 'user', content: user }],
    });
    const block = response.content.find(b => b.type === 'text');
    return parseJsonLoose(block.text);
  }
}

async function httpError(res) {
  const body = await res.text().catch(() => '');
  return new Error(`LLM request failed (${res.status}): ${body.slice(0, 300)}`);
}

async function openaiJSON(s, { system, user, schema, maxTokens }) {
  const base = (s.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`;

  let res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: s.model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } },
    }),
  });
  if (!res.ok && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403 && res.status !== 429) {
    // Endpoint likely doesn't support json_schema response format — retry with schema in the prompt
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: s.model,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: schemaPrompt(system, schema) }, { role: 'user', content: user }],
      }),
    });
  }
  if (!res.ok) throw await httpError(res);
  const data = await res.json();
  return parseJsonLoose(data.choices?.[0]?.message?.content || '');
}

async function geminiJSON(s, { system, user, schema, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent?key=${encodeURIComponent(s.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        responseSchema: stripUnsupported(schema),
      },
    }),
  });
  if (!res.ok) throw await httpError(res);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  return parseJsonLoose(text);
}

// ── Public API ────────────────────────────────────────────────────────────────

async function completeJSON({ system, user, schema, maxTokens = 2048 }) {
  if (!aiConfigured()) {
    const err = new Error('AI features are not configured. Open AI Settings and add a provider + API key.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  const s = getAiSettings();
  if (!s.model) throw new Error('No model configured. Set a model name in AI Settings.');
  if (s.provider === 'anthropic') return anthropicJSON(s, { system, user, schema, maxTokens });
  if (s.provider === 'gemini') return geminiJSON(s, { system, user, schema, maxTokens });
  return openaiJSON(s, { system, user, schema, maxTokens }); // openai + custom
}

async function testConnection() {
  const result = await completeJSON({
    system: 'You are a connectivity test. Follow the user instruction exactly.',
    user: 'Reply with the JSON object {"ok": true}',
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
      additionalProperties: false,
    },
    maxTokens: 600,
  });
  if (result?.ok !== true) throw new Error('Provider responded, but not with the expected JSON.');
  const s = getAiSettings();
  return { ok: true, provider: s.provider, model: s.model };
}

module.exports = { aiConfigured, getAiSettings, saveAiSettings, publicSettings, completeJSON, testConnection, parseJsonLoose };
