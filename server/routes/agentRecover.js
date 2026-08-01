/**
 * AI recovery planner — POST /api/agent/recover-plan
 *
 * Accepts a secret-free observation from the client recovery agent and returns
 * a structured action plan. Uses Ollama Cloud when OLLAMA_API_KEY is set;
 * otherwise falls back to the same observation-scored local planner the client
 * uses (so recovery still works offline / without AI).
 *
 * Never logs or echoes API keys.
 */
import { Router } from 'express';
import {
  ollamaChat,
  parseModelJson,
  getOllamaApiKey,
  DEFAULT_MODEL,
  OLLAMA_HOST,
  isCloudHost,
} from '../../scripts/lib/ollamaCloud.mjs';

const router = Router();

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    stop: { type: 'boolean' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tool: {
            type: 'string',
            enum: ['refetch_market', 'refetch_deps', 'wait', 'evaluate', 'noop', 'stop'],
          },
          marketId: { type: 'string' },
          marketIds: { type: 'array', items: { type: 'string' } },
          forceLive: { type: 'boolean' },
          ms: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['tool'],
      },
    },
  },
  required: ['summary', 'actions', 'stop'],
};

const SECRET_KEY = /api[_-]?key|authorization|bearer|password|secret|token|private|pem|credential/i;

function sanitize(obj, depth = 0) {
  if (depth > 8 || obj == null) return obj;
  if (typeof obj === 'string') {
    if (SECRET_KEY.test(obj) || /sk-[a-zA-Z0-9]{10,}/.test(obj)) return '[redacted]';
    return obj.length > 500 ? `${obj.slice(0, 500)}…` : obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.slice(0, 120).map((x) => sanitize(x, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY.test(k)) continue;
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

/** Local observation-scored planner (mirrors client fallback; no fixed market tree). */
export function localPlanFromObservation(observation, budgets = {}) {
  const maxFetches = Math.min(12, Number(budgets.maxFetchesPerCycle) || 8);
  const markets = observation?.markets || [];
  const waitingDeps = [...(observation?.waitingDeps || [])];

  const scored = markets
    .map((m) => {
      let score = 0;
      switch (m.symptom) {
        case 'empty_market': score = m.isTab ? 100 : 70; break;
        case 'timeout':
        case 'network': score = m.isTab ? 95 : 65; break;
        case 'hollow_shell': score = m.isTab ? 80 : 50; break;
        case 'waiting_cross': score = 40; break;
        case 'partial': score = 35; break;
        case 'rate_limit': score = 10; break;
        default: score = m.panelsFetchFail ? 30 : 0;
      }
      score += Math.min(20, (m.panelsFetchFail || 0) * 2);
      if (m.hasError) score += 15;
      return { ...m, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  const actions = [];
  let fetches = 0;

  if (scored.some((m) => m.symptom === 'rate_limit')) {
    actions.push({ tool: 'wait', ms: 2500, reason: 'rate_limit backoff' });
  }

  const deps = waitingDeps.slice(0, Math.max(0, maxFetches - fetches));
  if (deps.length) {
    actions.push({
      tool: 'refetch_deps',
      marketIds: deps,
      forceLive: false,
      reason: 'unlock waiting_cross panels',
    });
    fetches += deps.length;
  }

  for (const m of scored) {
    if (fetches >= maxFetches) break;
    if (m.symptom === 'rate_limit' || m.symptom === 'ok') continue;
    if (m.symptom === 'waiting_cross' && deps.length) continue;
    const forceLive = m.symptom === 'empty_market'
      || m.symptom === 'timeout'
      || m.symptom === 'network'
      || m.symptom === 'hollow_shell'
      || (m.symptom === 'partial' && m.isTab);
    actions.push({
      tool: 'refetch_market',
      marketId: m.marketId,
      forceLive: !!forceLive,
      reason: `${m.symptom} score=${m.score}`,
    });
    fetches += 1;
  }

  if (!actions.length) {
    return {
      summary: 'No recovery actions needed',
      stop: true,
      actions: [{ tool: 'noop', reason: 'observation clean' }],
    };
  }
  return {
    summary: `Local plan: ${actions.length} action(s)`,
    stop: false,
    actions,
  };
}

function buildSystemPrompt() {
  return `You are the live panel recovery agent for a multi-market financial React hub.
Given a compact observation of market symptoms and incomplete panels, choose the next recovery ACTIONS.

Tools (only these):
- refetch_market: { tool, marketId, forceLive, reason } — re-fetch one market
- refetch_deps: { tool, marketIds[], forceLive, reason } — re-fetch satellite deps
- wait: { tool, ms, reason } — backoff (rate limits / cold start)
- evaluate: { tool, reason } — re-observe only
- noop / stop: end recovery

Rules:
- Prefer refetch_deps (cache-first, forceLive=false) when waitingDeps is non-empty
- Prefer forceLive=true only for empty_market, timeout, network, hollow_shell on tab markets
- NEVER recommend a full-wave force-live of every market
- Do not refetch for display/confirm-only issues (DOM not painted) — use noop
- On rate_limit: wait first, avoid forceLive
- Max ~8 fetches in actions
- Never invent secrets or request credentials
- Output JSON only matching the schema`;
}

/**
 * POST body: { observation, budgets? }
 * Response: { plan, planner: 'ai'|'local', model?, host? }
 */
router.post('/recover-plan', async (req, res) => {
  try {
    const observation = sanitize(req.body?.observation || {});
    const budgets = req.body?.budgets || {};

    const summary = observation?.summary || {};
    const incomplete = Number(summary.incompletePanelCount) || 0;
    const empty = Number(summary.marketsEmpty) || 0;
    if (incomplete === 0 && empty === 0 && !(observation?.markets || []).some((m) => m.symptom && m.symptom !== 'ok')) {
      return res.json({
        plan: {
          summary: 'Observation already healthy',
          stop: true,
          actions: [{ tool: 'noop', reason: 'healthy' }],
        },
        planner: 'local',
      });
    }

    const hasKey = !!getOllamaApiKey();
    if (!hasKey) {
      return res.json({
        plan: localPlanFromObservation(observation, budgets),
        planner: 'local',
        note: 'OLLAMA_API_KEY not set — local planner',
      });
    }

    try {
      const chat = await ollamaChat({
        model: DEFAULT_MODEL,
        format: PLAN_SCHEMA,
        temperature: 0.15,
        seed: 7,
        keep_alive: '2m',
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: JSON.stringify({
              instruction: 'Return recovery plan JSON for this observation.',
              budgets: {
                maxFetchesPerCycle: budgets.maxFetchesPerCycle || 8,
              },
              observation,
            }),
          },
        ],
      });
      const plan = parseModelJson(chat.content);
      if (!plan?.actions || !Array.isArray(plan.actions)) {
        throw new Error('model returned no actions');
      }
      return res.json({
        plan: {
          summary: String(plan.summary || 'ai plan').slice(0, 400),
          stop: !!plan.stop,
          actions: plan.actions.slice(0, 16),
        },
        planner: 'ai',
        model: chat.model || DEFAULT_MODEL,
        host: isCloudHost() ? 'ollama.com' : OLLAMA_HOST,
      });
    } catch (e) {
      console.warn('[agent/recover-plan] Ollama failed, local fallback:', e.message);
      return res.json({
        plan: localPlanFromObservation(observation, budgets),
        planner: 'local',
        note: `ai_error: ${String(e.message || e).slice(0, 120)}`,
      });
    }
  } catch (e) {
    console.error('[agent/recover-plan]', e.message);
    res.status(500).json({ error: 'recover-plan failed', message: e.message });
  }
});

/** Health / capability probe — no secrets. */
router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: !!getOllamaApiKey(),
    model: DEFAULT_MODEL,
    host: isCloudHost() ? 'ollama.com' : 'local-or-custom',
  });
});

export default router;
