/**
 * Ollama HTTP API client — Cloud + local.
 *
 * Spec: https://github.com/ollama/ollama/blob/main/docs/api.md
 * Cloud: https://docs.ollama.com/cloud
 *   host https://ollama.com  +  Authorization: Bearer $OLLAMA_API_KEY
 *
 * Never log the API key.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenvConfig({ path: path.join(root, '.env') });
dotenvConfig({ path: path.join(root, '.env.local') });

/** Cloud host (Bearer). Override with OLLAMA_HOST. Local daemon: http://127.0.0.1:11434 */
export const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'https://ollama.com').replace(/\/$/, '');

/**
 * Default model. Cloud examples use e.g. gpt-oss:120b (no -cloud suffix on ollama.com API).
 * Local cloud-offload tags look like gpt-oss:120b-cloud via local daemon.
 */
export const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:120b';

export function getOllamaApiKey() {
  return String(process.env.OLLAMA_API_KEY || process.env.ollama_api_key || '').trim();
}

export function isCloudHost(host = OLLAMA_HOST) {
  try {
    const h = new URL(host).hostname;
    return h === 'ollama.com' || h.endsWith('.ollama.com');
  } catch {
    return /ollama\.com/i.test(String(host));
  }
}

export function assertOllamaConfigured() {
  if (isCloudHost() && !getOllamaApiKey()) {
    throw new Error(
      'OLLAMA_API_KEY missing for cloud host. Create a key at https://ollama.com/settings/keys and set it in .env',
    );
  }
  return getOllamaApiKey();
}

/**
 * Build request headers. Cloud needs Bearer; local daemon does not.
 * @param {Record<string,string>} [extra]
 */
export function buildHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (isCloudHost()) {
    const key = assertOllamaConfigured();
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

/**
 * Build POST /api/chat body per official API.
 * @param {object} opts
 * @param {string} [opts.model]
 * @param {{role:string, content:string, images?:string[], tool_calls?:object[], tool_name?:string, thinking?:string}[]} opts.messages
 * @param {boolean} [opts.stream=false]
 * @param {'json'|object} [opts.format]  // "json" or JSON Schema for structured outputs
 * @param {object} [opts.options]        // temperature, seed, num_ctx, stop, …
 * @param {string|number} [opts.keep_alive]
 * @param {object[]} [opts.tools]
 * @param {boolean|string} [opts.think]
 */
export function buildChatBody(opts) {
  if (!opts?.messages || !Array.isArray(opts.messages)) {
    throw new Error('buildChatBody: messages[] required');
  }
  const body = {
    model: opts.model || DEFAULT_MODEL,
    messages: opts.messages,
    stream: opts.stream === true,
  };
  if (opts.format != null) body.format = opts.format;
  if (opts.options && typeof opts.options === 'object') body.options = opts.options;
  if (opts.keep_alive != null) body.keep_alive = opts.keep_alive;
  if (opts.tools) body.tools = opts.tools;
  if (opts.think != null) body.think = opts.think;
  // Convenience: temperature alone → options.temperature
  if (opts.temperature != null) {
    body.options = { ...(body.options || {}), temperature: opts.temperature };
  }
  if (opts.seed != null) {
    body.options = { ...(body.options || {}), seed: opts.seed };
  }
  return body;
}

/**
 * Build POST /api/generate body.
 */
export function buildGenerateBody(opts) {
  const body = {
    model: opts.model || DEFAULT_MODEL,
    prompt: opts.prompt ?? '',
    stream: opts.stream === true,
  };
  if (opts.system != null) body.system = opts.system;
  if (opts.suffix != null) body.suffix = opts.suffix;
  if (opts.images) body.images = opts.images;
  if (opts.format != null) body.format = opts.format;
  if (opts.options) body.options = opts.options;
  if (opts.temperature != null) {
    body.options = { ...(body.options || {}), temperature: opts.temperature };
  }
  if (opts.keep_alive != null) body.keep_alive = opts.keep_alive;
  if (opts.raw != null) body.raw = opts.raw;
  if (opts.think != null) body.think = opts.think;
  return body;
}

/**
 * Normalize a non-streaming chat response.
 * Official shape: { model, message: { role, content, tool_calls? }, done, …metrics }
 */
export function normalizeChatResponse(data) {
  const content = data?.message?.content ?? data?.response ?? '';
  return {
    model: data?.model || '',
    role: data?.message?.role || 'assistant',
    content: String(content),
    thinking: data?.message?.thinking ?? null,
    tool_calls: data?.message?.tool_calls ?? null,
    done: data?.done !== false,
    done_reason: data?.done_reason ?? null,
    metrics: {
      total_duration: data?.total_duration,
      load_duration: data?.load_duration,
      prompt_eval_count: data?.prompt_eval_count,
      prompt_eval_duration: data?.prompt_eval_duration,
      eval_count: data?.eval_count,
      eval_duration: data?.eval_duration,
    },
    raw: data,
  };
}

/**
 * POST /api/chat (non-streaming by default).
 * @returns {Promise<ReturnType<typeof normalizeChatResponse>>}
 */
export async function ollamaChat(opts = {}) {
  const body = buildChatBody({ ...opts, stream: false });
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama /api/chat ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  return normalizeChatResponse(data);
}

/** Alias used by housekeep agent */
export async function ollamaCloudChat(opts) {
  return ollamaChat(opts);
}

/**
 * POST /api/generate (non-streaming).
 */
export async function ollamaGenerate(opts = {}) {
  const body = buildGenerateBody({ ...opts, stream: false });
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama /api/generate ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  return {
    model: data?.model || '',
    content: String(data?.response ?? ''),
    done: data?.done !== false,
    raw: data,
  };
}

/**
 * GET /api/tags — list models available on the host.
 * Cloud: https://ollama.com/api/tags (may not need auth for listing public tags).
 */
export async function ollamaListTags() {
  const headers = isCloudHost() && getOllamaApiKey()
    ? buildHeaders()
    : { Accept: 'application/json' };
  const res = await fetch(`${OLLAMA_HOST}/api/tags`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama /api/tags ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * GET /api/version when available.
 */
export async function ollamaVersion() {
  const res = await fetch(`${OLLAMA_HOST}/api/version`, {
    headers: isCloudHost() && getOllamaApiKey() ? buildHeaders() : {},
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Best-effort JSON parse of model content (strips markdown fences / prose).
 * For `format: "json"` or structured schema, content should already be JSON.
 */
export function parseModelJson(content) {
  let s = String(content || '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const objStart = s.indexOf('{');
  const arrStart = s.indexOf('[');
  let start = -1;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) start = objStart;
  else if (arrStart >= 0) start = arrStart;
  if (start > 0) s = s.slice(start);
  const endObj = s.lastIndexOf('}');
  const endArr = s.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (end >= 0) s = s.slice(0, end + 1);
  return JSON.parse(s);
}

/**
 * JSON Schema used by housekeep agent structured output (API `format` object).
 * @see Structured outputs in api.md
 */
export const HOUSEKEEP_FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    topIssues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          symptom: { type: 'string' },
          likelyCause: { type: 'string' },
          testGap: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['id', 'symptom', 'likelyCause', 'testGap', 'action'],
      },
    },
    recommendedCommands: {
      type: 'array',
      items: { type: 'string' },
    },
    draftTests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          title: { type: 'string' },
          rationale: { type: 'string' },
          code: { type: 'string' },
        },
        required: ['file', 'title', 'code'],
      },
    },
    doNotAutomate: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'severity', 'topIssues', 'recommendedCommands'],
};

// Back-compat aliases
export const OLLAMA_CLOUD_HOST = OLLAMA_HOST;
export const DEFAULT_CLOUD_MODEL = DEFAULT_MODEL;
export const assertOllamaCloudConfigured = assertOllamaConfigured;
