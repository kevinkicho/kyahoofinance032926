/**
 * L1 panel data readiness — pure payload scoring (no DOM).
 *
 * Sources (in order):
 *   1. Placeholders (panelPlaceholders) — primary fill gate
 *   2. Field map / registry spec — fallback when no placeholders
 *   3. Market contract panel requiredFields — annotation + soft fallback
 *
 * Does not create health shells, stamps, or touch the document.
 */

import { PANEL_REGISTRY } from '../../../data/panelRegistry.js';
import { getPanelFieldSpec } from '../../../data/panelFieldMap.js';
import {
  getPanelPlaceholders,
  MIN_PLACEHOLDER_FILL_RATE,
} from '../../../data/panelPlaceholders.js';
import {
  resolvePath,
  hasSubstance,
  countNumericLeaves,
  placeholderValueOk,
} from '../panelHealthUtils.js';
import { getMarketContract } from '../../../../shared/contracts/index.js';
import { DATA, attachHealthLayers } from './types.js';

/**
 * @typedef {object} PanelDataResult
 * @property {boolean} fetchOk
 * @property {string} fetchDetail
 * @property {*} fieldValue best metric sample source for L2 confirm
 * @property {object|null} placeholders fill stats
 * @property {'waiting'|'ready'|'partial'|'empty'|'error'|'unknown'} dataState
 * @property {string} reason
 * @property {Array<number|string>} samples leaf samples for confirm
 * @property {'placeholders'|'spec'|'contract'|'none'} source
 * @property {{ ok: boolean, missing: string[], panelId?: string }|null} contract
 * @property {object|null} spec field-map/registry spec used
 */

export function getRegistryEntry(marketId, panelId) {
  const regKey = marketId === 'equitiesDeepDive' ? 'equityDeepDive' : marketId;
  const list = PANEL_REGISTRY[regKey] || PANEL_REGISTRY[marketId];
  if (!list) return null;
  return list.find((p) => p.id === panelId) || null;
}

/** Spec for field resolution: map first, then registry. */
export function getPanelSpec(marketId, panelId) {
  const mapped = getPanelFieldSpec(marketId, panelId);
  if (mapped) return { id: panelId, ...mapped, _from: 'fieldMap' };
  const reg = getRegistryEntry(marketId, panelId);
  if (reg) return { ...reg, _from: 'registry' };
  return null;
}

function resolveOneSpec(spec, marketData, allMarkets) {
  if (!spec) return undefined;
  if (spec.crossMarket) {
    const depData = allMarkets?.[spec.crossMarket]?.data;
    if (!depData) return null;
    return spec.fieldPath ? resolvePath(depData, spec.fieldPath) : depData;
  }
  const field = spec.field || '';
  if (typeof field === 'string' && field.includes('cross-market:')) {
    const depId = field.match(/cross-market:\s*([^)]+)/i)?.[1]?.trim();
    const depData = depId ? allMarkets?.[depId]?.data : null;
    if (!depData) return null;
    let path = spec.fieldPath || '';
    path = path.replace(/^\w+Ctx\.data\.?/, '');
    if (!path || path === spec.fieldPath) {
      const parts = String(spec.fieldPath || '').split('.');
      const idx = parts.findIndex((p) => p === 'data');
      path = idx >= 0 ? parts.slice(idx + 1).join('.') : parts.slice(-1).join('.');
    }
    return path ? resolvePath(depData, path) : depData;
  }
  if (spec.fieldPath) {
    const v = resolvePath(marketData, spec.fieldPath);
    if (v !== undefined && v !== null) return v;
  }
  if (spec.field && !String(spec.field).startsWith('(')) {
    return resolvePath(marketData, spec.field);
  }
  return undefined;
}

export function resolvePanelFieldValue(spec, marketData, allMarkets) {
  if (!spec) return undefined;
  if (Array.isArray(spec.anyOf)) {
    for (const alt of spec.anyOf) {
      const v = resolveOneSpec(alt, marketData, allMarkets);
      if (hasSubstance(v)) return v;
    }
    return resolveOneSpec(spec.anyOf[0], marketData, allMarkets);
  }
  return resolveOneSpec(spec, marketData, allMarkets);
}

export function collectSamples(val, out = [], depth = 0) {
  if (out.length >= 20 || depth > 5) return out;
  if (val == null) return out;
  if (typeof val === 'number' && Number.isFinite(val)) {
    out.push(val);
    return out;
  }
  if (typeof val === 'string') {
    const t = val.trim();
    if (t.length >= 2 && t.length <= 40 && t !== '—' && !t.startsWith('_') && !/^\d{4}$/.test(t)) {
      out.push(t);
    }
    return out;
  }
  if (Array.isArray(val)) {
    const slice = val.length > 16 ? val.slice(-16) : val;
    for (const item of slice) collectSamples(item, out, depth + 1);
    return out;
  }
  if (typeof val === 'object') {
    for (const prefer of ['value', 'price', 'latest', 'close', 'closeB', 'change', 'change1d', 'gdp', 'rate', 'spread']) {
      if (prefer in val) collectSamples(val[prefer], out, depth + 1);
      if (out.length >= 20) return out;
    }
    if (Array.isArray(val.values)) collectSamples(val.values, out, depth + 1);
    if (Array.isArray(val.history)) collectSamples(val.history, out, depth + 1);
    if (Array.isArray(val.coins)) collectSamples(val.coins, out, depth + 1);
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith('_') || k === 'dates' || k === 'labels' || k === 'columns') continue;
      collectSamples(v, out, depth + 1);
      if (out.length >= 20) break;
    }
  }
  return out;
}

function scoreFieldCandidate(path, v) {
  if (!placeholderValueOk(v, path)) return -1;
  const depth = String(path || '').split('.').filter(Boolean).length;
  const nums = countNumericLeaves(v).n;
  return depth * 10 + Math.min(nums, 9);
}

/**
 * Contract panel requiredFields check (market-level contract, panel entry).
 * @returns {{ ok: boolean, missing: string[], required: string[] }|null}
 */
export function evaluateContractPanelFields(marketId, panelId, primary) {
  const c = getMarketContract(marketId);
  if (!c?.panels?.length) return null;
  const entry = c.panels.find((p) => p.panelId === panelId);
  if (!entry?.requiredFields?.length) return null;
  if (!primary || typeof primary !== 'object') {
    return { ok: false, missing: entry.requiredFields.slice(), required: entry.requiredFields.slice() };
  }
  const missing = [];
  for (const f of entry.requiredFields) {
    const v = resolvePath(primary, f);
    if (v == null || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)) {
      missing.push(f);
    } else if (Array.isArray(v) && v.length === 0) {
      missing.push(f);
    }
  }
  return {
    ok: missing.length === 0,
    missing,
    required: entry.requiredFields.slice(),
  };
}

function buildAllDataMap(marketId, primary, allMarkets) {
  const allDataMap = {};
  for (const [id, m] of Object.entries(allMarkets || {})) {
    allDataMap[id] = m?.data !== undefined ? m.data : m;
  }
  if (primary) allDataMap[marketId] = primary;
  return allDataMap;
}

/**
 * Pure L1 evaluation — no DOM.
 *
 * @param {{
 *   marketId: string,
 *   panelId: string,
 *   marketCtx?: object,
 *   allMarkets?: object,
 * }} args
 * @returns {PanelDataResult}
 */
export function evaluatePanelData({ marketId, panelId, marketCtx, allMarkets }) {
  const spec = getPanelSpec(marketId, panelId);
  const placeholders = getPanelPlaceholders(marketId, panelId);
  const primary = marketCtx?.data || null;
  const allDataMap = buildAllDataMap(marketId, primary, allMarkets);

  let fetchOk = false;
  let fetchDetail = '';
  let fieldValue = null;
  let placeholderStats = null;
  /** @type {PanelDataResult['source']} */
  let source = 'none';

  // ── Loading short-circuit (caller may also handle) ──
  if (marketCtx?.isLoading && !primary) {
    return {
      fetchOk: false,
      fetchDetail: 'market still loading',
      fieldValue: null,
      placeholders: null,
      dataState: DATA.WAITING,
      reason: 'loading',
      samples: [],
      source: 'none',
      contract: null,
      spec,
    };
  }

  if (placeholders?.length) {
    source = 'placeholders';
    let filled = 0;
    let requiredTotal = 0;
    let requiredFilled = 0;
    const emptyIds = [];
    const filledIds = [];
    const emptyRequiredIds = [];
    const waitingDeps = [];
    let bestFieldScore = -1;

    for (const slot of placeholders) {
      const isRequired = slot.required !== false;
      if (isRequired) requiredTotal++;
      let v = null;
      let usedPath = slot.path || '';

      if (slot.crossMarket) {
        const depId = slot.crossMarket;
        const depCtx = allMarkets?.[depId];
        const dep = allDataMap[depId];
        const depPending = !dep
          && !depCtx?.error
          && (depCtx?.isLoading || depCtx?.data == null);
        if (depPending && isRequired) {
          if (!waitingDeps.includes(depId)) waitingDeps.push(depId);
        }
        if (dep) {
          if (slot.path) {
            v = resolvePath(dep, slot.path);
            usedPath = slot.path;
          } else if (Array.isArray(slot.anyOf) && slot.anyOf.length) {
            for (const pth of slot.anyOf) {
              const cand = resolvePath(dep, pth);
              if (placeholderValueOk(cand, pth)) {
                v = cand;
                usedPath = pth;
                break;
              }
            }
          } else {
            v = dep;
            usedPath = slot.crossMarket;
          }
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
            usedPath = pth;
            break;
          }
        }
      } else if (slot.path) {
        v = resolvePath(primary, slot.path);
        usedPath = slot.path;
        if (!placeholderValueOk(v, slot.path)) {
          const parts = slot.path.split('.');
          if (parts.length >= 2 && allDataMap[parts[0]]) {
            v = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
          }
        }
      }

      if (
        Array.isArray(v)
        && !v.some((x) => hasSubstance(x))
        && !placeholderValueOk(v, usedPath)
      ) {
        v = null;
      }

      if (placeholderValueOk(v, usedPath)) {
        filled++;
        filledIds.push(slot.id);
        if (isRequired) requiredFilled++;
        const sc = scoreFieldCandidate(usedPath, v);
        if (sc > bestFieldScore) {
          bestFieldScore = sc;
          fieldValue = v;
        }
      } else {
        emptyIds.push(slot.id);
        if (isRequired) emptyRequiredIds.push(slot.id);
      }
    }

    const denom = requiredTotal > 0 ? requiredTotal : placeholders.length;
    const numer = requiredTotal > 0 ? requiredFilled : filled;
    const fillRate = denom > 0 ? numer / denom : 0;
    placeholderStats = {
      total: placeholders.length,
      requiredTotal,
      filled,
      requiredFilled,
      empty: emptyIds.length,
      fillRate,
      emptyIds,
      emptyRequiredIds,
      filledIds,
      waitingDeps: waitingDeps.slice(),
    };

    const onlyWaitingOnDeps = waitingDeps.length > 0
      && emptyRequiredIds.length > 0
      && numer < denom
      && emptyRequiredIds.every((id) => {
        const slot = placeholders.find((s) => s.id === id);
        return slot?.crossMarket && waitingDeps.includes(slot.crossMarket);
      });

    if (onlyWaitingOnDeps) {
      fetchOk = false;
      fetchDetail = `waiting for cross-market: ${waitingDeps.join(', ')}`;
    } else {
      fetchOk = fillRate >= MIN_PLACEHOLDER_FILL_RATE;
      fetchDetail = fetchOk
        ? `placeholders ${numer}/${denom} required (${Math.round(fillRate * 100)}% ≥ ${Math.round(MIN_PLACEHOLDER_FILL_RATE * 100)}%)`
        : `placeholders ${numer}/${denom} required (${Math.round(fillRate * 100)}% < ${Math.round(MIN_PLACEHOLDER_FILL_RATE * 100)}%) empty=[${emptyRequiredIds.slice(0, 6).join(', ')}]`;
    }
  } else if (!marketCtx?.data && !spec?.crossMarket) {
    fetchOk = false;
    fetchDetail = marketCtx?.error
      ? `fetch error: ${marketCtx.error}`
      : 'market payload not fetched';
    source = 'none';
  } else if (spec) {
    source = 'spec';
    fieldValue = resolvePanelFieldValue(spec, primary, allMarkets);
    if (typeof spec.shapeCheck === 'function') {
      try {
        const sc = spec.shapeCheck(fieldValue);
        fetchOk = !!sc?.ok;
        fetchDetail = sc?.detail || (fetchOk ? 'shape ok' : 'shape check failed');
      } catch (e) {
        fetchOk = false;
        fetchDetail = `shapeCheck error: ${e.message}`;
      }
    } else {
      fetchOk = hasSubstance(fieldValue);
      if (fetchOk && countNumericLeaves(fieldValue).n === 0 && typeof fieldValue === 'object') {
        const samples = collectSamples(fieldValue);
        const hasRich = samples.some((s) => typeof s === 'string' && s.length >= 3);
        if (!hasRich) fetchOk = false;
      }
      const pathLabel = spec.crossMarket
        ? `${spec.crossMarket}.${spec.fieldPath || spec.field}`
        : (spec.fieldPath || spec.field || panelId);
      fetchDetail = fetchOk
        ? `field "${pathLabel}" has data`
        : `field "${pathLabel}" is null/empty/hollow`;
    }
  } else {
    if (!primary) {
      fetchOk = false;
      fetchDetail = 'no field map and no market payload';
    } else {
      fetchOk = false;
      fetchDetail = 'no placeholders or field map for panel';
      fieldValue = null;
    }
    source = 'none';
  }

  // Contract panel fields — annotation always.
  // Explicit (non-auto) contracts: AND with other sources (fail if contract missing).
  // Auto / soft: allow contract-only pass when no placeholders/spec.
  const contractCheck = evaluateContractPanelFields(marketId, panelId, primary);
  const marketContract = getMarketContract(marketId);
  const explicitContract = !!(marketContract && marketContract.auto !== true);

  if (contractCheck) {
    if (
      explicitContract
      && !contractCheck.ok
      && fetchOk
      && primary
      && !/waiting for cross-market/i.test(fetchDetail)
    ) {
      // Explicit contract is a hard gate: placeholders/spec alone cannot green L1.
      fetchOk = false;
      fetchDetail = `contract missing [${contractCheck.missing.join(', ')}] (after ${source}: ${fetchDetail})`;
      source = source === 'none' ? 'contract' : `${source}+contract`;
    } else if (!fetchOk && source === 'none' && primary && contractCheck.ok) {
      // Soft fallback: contract panel fields all present → data ready
      fetchOk = true;
      fetchDetail = `contract panel fields ok (${contractCheck.required.join(', ')})`;
      source = 'contract';
      if (fieldValue == null) {
        for (const f of contractCheck.required) {
          const v = resolvePath(primary, f);
          if (hasSubstance(v)) {
            fieldValue = v;
            break;
          }
        }
        if (fieldValue == null) fieldValue = primary;
      }
    } else if (fetchOk && contractCheck.ok && explicitContract && source === 'placeholders') {
      // Annotate that explicit contract also passed
      fetchDetail = `${fetchDetail}; contract ok`;
    }
  }

  if (fetchOk && fieldValue == null && primary) {
    fieldValue = primary;
  }

  const samples = fieldValue != null ? collectSamples(fieldValue) : [];

  // Map to L1 dataState
  let dataState = DATA.UNKNOWN;
  let reason = fetchDetail || '';
  if (/waiting for cross-market/i.test(fetchDetail)) {
    dataState = DATA.WAITING;
    reason = fetchDetail;
  } else if (marketCtx?.isLoading && !fetchOk) {
    dataState = DATA.WAITING;
    reason = 'loading';
  } else if (fetchOk) {
    dataState = DATA.READY;
    reason = fetchDetail || 'data_ready';
  } else if (!primary && !marketCtx?.error) {
    dataState = DATA.WAITING;
    reason = fetchDetail || 'waiting';
  } else if (marketCtx?.error || /fetch error/i.test(fetchDetail)) {
    dataState = DATA.ERROR;
    reason = fetchDetail || 'error';
  } else if (
    placeholderStats
    && placeholderStats.fillRate > 0
    && placeholderStats.fillRate < MIN_PLACEHOLDER_FILL_RATE
  ) {
    dataState = DATA.PARTIAL;
    reason = fetchDetail || 'partial_fill';
  } else {
    dataState = DATA.EMPTY;
    reason = fetchDetail || 'empty';
  }

  return {
    fetchOk,
    fetchDetail,
    fieldValue,
    placeholders: placeholderStats,
    dataState,
    reason,
    samples,
    source,
    contract: contractCheck
      ? { ok: contractCheck.ok, missing: contractCheck.missing, panelId }
      : null,
    spec,
  };
}

/**
 * Batch L1 for a list of panel ids (offline scoring, no DOM).
 * @param {string} marketId
 * @param {object} marketCtx
 * @param {object} allMarkets
 * @param {Array<{ id: string, title?: string }|string>} panels
 */
export function evaluateMarketPanelData(marketId, marketCtx, allMarkets, panels = []) {
  const out = {};
  for (const p of panels) {
    const panelId = typeof p === 'string' ? p : p.id;
    out[panelId] = evaluatePanelData({ marketId, panelId, marketCtx, allMarkets });
  }
  return out;
}

/**
 * Convert pure L1 result into a splash/seed report (paint not claimed).
 * Progressive splash + HubLayout seed use this — no DOM, no bridge shells.
 */
export function reportFromPanelData(l1, { marketId, panelId, title, marketCtx } = {}) {
  const fetchOk = !!l1?.fetchOk;
  const loading = l1?.dataState === DATA.WAITING && /loading/i.test(String(l1?.reason || l1?.fetchDetail || ''));
  let status = 'null';
  if (loading || (marketCtx?.isLoading && !fetchOk)) status = 'loading';
  else if (fetchOk) status = 'pending'; // data ready, paint n/a
  else if (l1?.dataState === DATA.WAITING) status = 'pending';
  else if (!marketCtx?.data && !marketCtx?.error) status = 'pending';
  else status = 'null';

  return attachHealthLayers({
    status,
    marketId,
    panelId,
    title: title || panelId,
    fetchOk,
    displayOk: false,
    confirmOk: false,
    uiOk: false,
    bridgeOnly: false,
    healthQuality: null,
    fetchDetail: l1?.fetchDetail || '',
    displayDetail: 'L1 data only — open tab to verify paint',
    confirmDetail: 'n/a until tab open',
    elPresent: false,
    fetchedOn: marketCtx?.fetchedOn || marketCtx?.data?.fetchedOn || null,
    isLive: !!marketCtx?.isLive,
    isCurrent: marketCtx?.isCurrent,
    placeholders: l1?.placeholders || null,
    dataSource: l1?.source || 'none',
    contract: l1?.contract || null,
    dataSamples: l1?.samples || [],
  });
}

/**
 * Full-market L1 reports (progressive splash / seed). No DOM.
 * @param {function|object} getMarket
 * @param {object} allMarkets
 * @param {Record<string, Array<{id:string,title?:string}>>} marketPanels
 */
export function evaluateAllMarketsDataOnly(getMarket, allMarkets, marketPanels = {}) {
  const cache = {};
  const markets = allMarkets || {};
  for (const marketId of Object.keys(marketPanels)) {
    const marketCtx = typeof getMarket === 'function' ? getMarket(marketId) : markets?.[marketId];
    const panels = marketPanels[marketId] || [];
    cache[marketId] = {};
    for (const p of panels) {
      const panelId = p.id || p;
      const title = p.title || panelId;
      const l1 = evaluatePanelData({ marketId, panelId, marketCtx, allMarkets: markets });
      cache[marketId][panelId] = reportFromPanelData(l1, { marketId, panelId, title, marketCtx });
    }
  }
  return cache;
}
