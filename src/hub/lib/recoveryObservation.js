/**
 * Build a compact, secret-free observation of market/panel health for the
 * recovery agent. No API keys, tokens, or full payloads — only ids, rates,
 * error *kinds*, and empty placeholder ids.
 */

import { MARKET_PANELS } from '../../data/marketPanels';
import { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } from '../../data/panelPlaceholders';
import { resolvePath, placeholderValueOk } from './panelHealthUtils.js';
import { hasNonNullData } from './guards.js';

function marketHasUsableData(marketEntry, marketId) {
  if (!marketEntry?.data) return false;
  return hasNonNullData(marketEntry.data, marketId);
}

const SECRET_KEY = /api[_-]?key|authorization|bearer|password|secret|token|private|pem|credential/i;

/** Classify last fetchLog entry into a stable error kind (no free text spam). */
export function classifyFetchLogEntry(entry) {
  if (!entry) return null;
  const blob = `${entry.error || ''} ${entry.warning || ''} ${entry.status || ''}`.toLowerCase();
  if (/429|rate.?limit/.test(blob)) return 'rate_limit';
  if (/403|forbidden/.test(blob)) return 'forbidden';
  if (/timeout|abort|504|etimedout/.test(blob)) return 'timeout';
  if (/econnreset|socket|network|fetch failed|failed to fetch|502|503/.test(blob)) return 'network';
  if (/empty|kept previous|hollow|partial structural/.test(blob)) return 'hollow';
  if (entry.status && entry.status >= 500) return 'upstream_5xx';
  if (entry.status && entry.status >= 400) return 'http_4xx';
  if (entry.error) return 'error';
  if (entry.warning) return 'warning';
  return entry.status === 200 ? 'ok' : null;
}

/**
 * Score placeholder fill for one panel without requiring DOM (fetch gate only).
 * @returns {{ fillRate: number, emptyRequiredIds: string[], waitingDeps: string[], fetchOk: boolean }}
 */
export function scorePanelFetchGate(marketId, panelId, markets) {
  const placeholders = getPanelPlaceholders(marketId, panelId) || [];
  const marketCtx = markets?.[marketId];
  const primary = marketCtx?.data || null;
  const allDataMap = {};
  for (const [id, m] of Object.entries(markets || {})) {
    allDataMap[id] = m?.data !== undefined ? m.data : m;
  }
  if (primary) allDataMap[marketId] = primary;

  if (!placeholders.length) {
    const usable = marketHasUsableData(marketCtx, marketId);
    return {
      fillRate: usable ? 1 : 0,
      emptyRequiredIds: usable ? [] : ['(no-placeholder-catalog)'],
      waitingDeps: [],
      fetchOk: usable,
    };
  }

  let requiredTotal = 0;
  let requiredFilled = 0;
  const emptyRequiredIds = [];
  const waitingDeps = [];

  for (const slot of placeholders) {
    const isRequired = slot.required !== false;
    if (isRequired) requiredTotal++;
    let v = null;

    if (slot.crossMarket) {
      const depId = slot.crossMarket;
      const depCtx = markets?.[depId];
      const dep = allDataMap[depId];
      const depPending = !dep
        && !depCtx?.error
        && (depCtx?.isLoading || depCtx?.data == null);
      if (depPending && isRequired && !waitingDeps.includes(depId)) {
        waitingDeps.push(depId);
      }
      if (dep) {
        if (slot.path) v = resolvePath(dep, slot.path);
        else if (Array.isArray(slot.anyOf)) {
          for (const pth of slot.anyOf) {
            const cand = resolvePath(dep, pth);
            if (placeholderValueOk(cand, pth)) {
              v = cand;
              break;
            }
          }
        } else v = dep;
      }
    } else if (slot.anyOf) {
      for (const pth of slot.anyOf) {
        let cand = resolvePath(primary, pth);
        if (!placeholderValueOk(cand, pth)) {
          const parts = pth.split('.');
          if (parts.length >= 2 && allDataMap[parts[0]]) {
            cand = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
          }
        }
        if (placeholderValueOk(cand, pth)) {
          v = cand;
          break;
        }
      }
    } else if (slot.path) {
      v = resolvePath(primary, slot.path);
      if (!placeholderValueOk(v, slot.path)) {
        const parts = slot.path.split('.');
        if (parts.length >= 2 && allDataMap[parts[0]]) {
          v = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
        }
      }
    }

    if (Array.isArray(v) && v.length && v.every((x) => x == null)) v = null;
    const ok = placeholderValueOk(v, slot.path || slot.id);
    if (ok) {
      if (isRequired) requiredFilled++;
    } else if (isRequired) {
      emptyRequiredIds.push(slot.id || slot.path || '?');
    }
  }

  const denom = requiredTotal || 1;
  const fillRate = requiredFilled / denom;
  const onlyWaiting = waitingDeps.length > 0
    && emptyRequiredIds.length > 0
    && requiredFilled === 0;
  const fetchOk = onlyWaiting ? false : fillRate >= MIN_PLACEHOLDER_FILL_RATE;

  return {
    fillRate,
    emptyRequiredIds: emptyRequiredIds.slice(0, 12),
    waitingDeps,
    fetchOk: onlyWaiting ? false : fetchOk,
    pendingDepsOnly: onlyWaiting,
  };
}

/**
 * Cluster a market into a recovery symptom for the planner.
 */
export function clusterMarketSymptom(marketEntry, marketId, panelScores) {
  const log0 = marketEntry?.fetchLog?.[0];
  const kind = classifyFetchLogEntry(log0);
  const usable = marketHasUsableData(marketEntry, marketId);
  const waiting = new Set();
  let hollowPanels = 0;
  let fetchFailPanels = 0;
  let okPanels = 0;
  for (const s of Object.values(panelScores || {})) {
    (s.waitingDeps || []).forEach((d) => waiting.add(d));
    if (s.fetchOk) okPanels++;
    else if (s.pendingDepsOnly) { /* counted via waiting */ }
    else {
      fetchFailPanels++;
      if ((s.fillRate || 0) < 0.4) hollowPanels++;
    }
  }

  if (kind === 'rate_limit') return 'rate_limit';
  if (kind === 'timeout' && !usable) return 'timeout';
  if (kind === 'network' && !usable) return 'network';
  if (waiting.size > 0 && !usable) return 'waiting_cross';
  if (waiting.size > 0 && fetchFailPanels > 0) return 'waiting_cross';
  if (!usable) return 'empty_market';
  if (hollowPanels > 0 || fetchFailPanels > 0) return 'hollow_shell';
  if (kind === 'hollow' || kind === 'warning') return 'partial';
  if (okPanels > 0 && fetchFailPanels === 0) return 'ok';
  return usable ? 'partial' : 'empty_market';
}

/**
 * @param {Record<string, object>} markets — DataProvider markets map
 * @param {{ tabMarketIds?: string[], maxPanelsPerMarket?: number }} [opts]
 */
export function buildRecoveryObservation(markets, opts = {}) {
  const maxPanels = opts.maxPanelsPerMarket ?? 24;
  const tabIds = new Set(opts.tabMarketIds || Object.keys(MARKET_PANELS));
  const marketsOut = [];
  const incompletePanels = [];
  const waitingDepsGlobal = new Set();

  for (const marketId of Object.keys(MARKET_PANELS)) {
    if (opts.onlyMarkets && !opts.onlyMarkets.includes(marketId)) continue;
    const entry = markets?.[marketId] || {};
    const panels = MARKET_PANELS[marketId] || [];
    const panelScores = {};
    for (const p of panels.slice(0, maxPanels)) {
      panelScores[p.id] = scorePanelFetchGate(marketId, p.id, markets);
      const sc = panelScores[p.id];
      (sc.waitingDeps || []).forEach((d) => waitingDepsGlobal.add(d));
      if (!sc.fetchOk && !sc.pendingDepsOnly) {
        incompletePanels.push({
          marketId,
          panelId: p.id,
          fillRate: Math.round((sc.fillRate || 0) * 100) / 100,
          emptyRequiredIds: sc.emptyRequiredIds.slice(0, 6),
          waitingDeps: sc.waitingDeps.slice(0, 6),
        });
      } else if (sc.pendingDepsOnly) {
        incompletePanels.push({
          marketId,
          panelId: p.id,
          fillRate: 0,
          emptyRequiredIds: sc.emptyRequiredIds.slice(0, 4),
          waitingDeps: sc.waitingDeps.slice(0, 6),
          pendingDepsOnly: true,
        });
      }
    }

    const symptom = clusterMarketSymptom(entry, marketId, panelScores);
    const failed = Object.values(panelScores).filter((s) => !s.fetchOk).length;
    const total = Object.keys(panelScores).length || panels.length;
    const log0 = entry.fetchLog?.[0];

    marketsOut.push({
      marketId,
      isTab: tabIds.has(marketId),
      symptom,
      usable: marketHasUsableData(entry, marketId),
      isLoading: !!entry.isLoading,
      isLive: !!entry.isLive,
      hasError: !!entry.error && !entry.data,
      lastErrorKind: classifyFetchLogEntry(log0),
      panelsTotal: total,
      panelsFetchFail: failed,
      sampleEmpty: incompletePanels
        .filter((p) => p.marketId === marketId)
        .slice(0, 5)
        .map((p) => p.panelId),
    });
  }

  // Drop any accidental secret-looking keys from a shallow walk (defensive)
  const observation = {
    collectedAt: new Date().toISOString(),
    minFillRate: MIN_PLACEHOLDER_FILL_RATE,
    markets: marketsOut,
    incompletePanels: incompletePanels.slice(0, 80),
    waitingDeps: [...waitingDepsGlobal].slice(0, 40),
    summary: {
      marketsTotal: marketsOut.length,
      marketsOk: marketsOut.filter((m) => m.symptom === 'ok').length,
      marketsEmpty: marketsOut.filter((m) => m.symptom === 'empty_market').length,
      marketsHollow: marketsOut.filter((m) => m.symptom === 'hollow_shell' || m.symptom === 'partial').length,
      marketsWaiting: marketsOut.filter((m) => m.symptom === 'waiting_cross').length,
      incompletePanelCount: incompletePanels.length,
    },
  };

  return sanitizeObservation(observation);
}

/** Strip anything that looks like a secret if nested objects sneak in. */
export function sanitizeObservation(obj, depth = 0) {
  if (depth > 8 || obj == null) return obj;
  if (typeof obj === 'string') {
    if (SECRET_KEY.test(obj) || /sk-[a-zA-Z0-9]{10,}/.test(obj)) return '[redacted]';
    return obj.length > 400 ? `${obj.slice(0, 400)}…` : obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.slice(0, 100).map((x) => sanitizeObservation(x, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY.test(k)) continue;
    out[k] = sanitizeObservation(v, depth + 1);
  }
  return out;
}
