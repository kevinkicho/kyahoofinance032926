/**
 * In-memory panel health bus.
 * DataProvider records which markets have non-empty field streams.
 * Splash / topbar combine bus + DOM scan so panels go green as soon as
 * the payload is ready — even if a grid has not painted yet.
 */

import { MARKET_PANELS } from '../../data/marketPanels';
import { getPanelFieldSpec } from '../../data/panelFieldMap';

/** marketId -> { panelId -> { fetchOk, samples, fieldPath, updatedAt } } */
const bus = new Map();
const listeners = new Set();

// Local helpers (avoid circular import with panelHealthEval)
function resolvePath(obj, path) {
  if (obj == null || path == null || path === '') return obj;
  let cur = obj;
  for (const p of String(path).split('.').filter(Boolean)) {
    if (cur == null) return null;
    cur = cur[p];
  }
  return cur;
}
function hasSubstance(v, depth = 0) {
  if (v == null || v === false || v === '') return false;
  if (depth > 5) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.trim().length > 0 && v !== '—';
  if (Array.isArray(v)) return v.length > 0 && v.some(x => hasSubstance(x, depth + 1));
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter(k => !k.startsWith('_'));
    return keys.length > 0 && keys.some(k => hasSubstance(v[k], depth + 1));
  }
  return true;
}

function resolveOne(spec, data, allMarkets) {
  if (!spec) return undefined;
  if (Array.isArray(spec.anyOf)) {
    for (const a of spec.anyOf) {
      const v = resolveOne(a, data, allMarkets);
      if (hasSubstance(v)) return v;
    }
    return null;
  }
  if (spec.crossMarket) {
    const dep = allMarkets?.[spec.crossMarket]?.data ?? allMarkets?.[spec.crossMarket];
    if (!dep) return null;
    return spec.fieldPath ? resolvePath(dep, spec.fieldPath) : dep;
  }
  if (spec.fieldPath) return resolvePath(data, spec.fieldPath);
  if (spec.field) return resolvePath(data, spec.field);
  return undefined;
}

function collectNums(val, out = [], depth = 0) {
  if (out.length >= 8 || depth > 4) return out;
  if (typeof val === 'number' && Number.isFinite(val)) {
    out.push(val);
    return out;
  }
  if (Array.isArray(val)) {
    for (const x of val.slice(-8)) collectNums(x, out, depth + 1);
    return out;
  }
  if (val && typeof val === 'object') {
    for (const v of Object.values(val)) {
      collectNums(v, out, depth + 1);
      if (out.length >= 8) break;
    }
  }
  return out;
}

/**
 * Record fetch health for every panel in a market from its payload.
 * @param {string} marketId
 * @param {object|null} marketData
 * @param {object} allMarkets - map of marketId -> { data } or raw data
 */
export function publishMarketPayload(marketId, marketData, allMarkets = {}) {
  if (!marketId) return;
  const panels = MARKET_PANELS[marketId] || [];
  const entry = bus.get(marketId) || {};
  const now = Date.now();

  // Normalize allMarkets to raw data maps
  const allData = {};
  for (const [id, m] of Object.entries(allMarkets || {})) {
    allData[id] = m?.data !== undefined ? m.data : m;
  }
  if (marketData) allData[marketId] = marketData;

  for (const p of panels) {
    const spec = getPanelFieldSpec(marketId, p.id);
    let fetchOk = false;
    let fieldValue = null;
    if (spec) {
      fieldValue = resolveOne(spec, marketData, allData);
      fetchOk = hasSubstance(fieldValue);
    } else if (marketData && typeof marketData === 'object') {
      const keys = Object.keys(marketData).filter(k => !k.startsWith('_'));
      fetchOk = keys.some(k => hasSubstance(marketData[k]));
      fieldValue = marketData;
    }
    entry[p.id] = {
      fetchOk,
      samples: fetchOk ? collectNums(fieldValue) : [],
      fieldPath: spec?.fieldPath || spec?.field || null,
      updatedAt: now,
      title: p.title,
    };
  }
  bus.set(marketId, entry);
  listeners.forEach(fn => {
    try { fn(marketId); } catch { /* ignore */ }
  });
}

export function getBusPanel(marketId, panelId) {
  return bus.get(marketId)?.[panelId] || null;
}

export function getBusMarket(marketId) {
  return bus.get(marketId) || {};
}

export function subscribePanelHealthBus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearPanelHealthBus() {
  bus.clear();
}
