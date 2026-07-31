/**
 * In-memory panel health bus.
 * DataProvider records which markets have non-empty field streams.
 * Used for loading UX only — evaluatePanelHealth does NOT free-pass fetch
 * from bus (that caused false greens for years).
 */

import { MARKET_PANELS } from '../../data/marketPanels';
import { getPanelFieldSpec } from '../../data/panelFieldMap';
import { getPanelPlaceholders } from '../../data/panelPlaceholders';
import { resolvePath, hasSubstance, placeholderValueOk } from './panelHealthUtils.js';

/** marketId -> { panelId -> { fetchOk, samples, fieldPath, updatedAt } } */
const bus = new Map();
const listeners = new Set();

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

function placeholderFetchOk(marketId, panelId, marketData, allData) {
  const placeholders = getPanelPlaceholders(marketId, panelId);
  if (!placeholders?.length) return null;
  let requiredTotal = 0;
  let requiredFilled = 0;
  for (const slot of placeholders) {
    if (slot.required === false) continue;
    requiredTotal += 1;
    let v = null;
    let usedPath = slot.path || '';
    if (slot.crossMarket) {
      const dep = allData[slot.crossMarket];
      if (dep) {
        if (slot.path) {
          v = resolvePath(dep, slot.path);
          usedPath = slot.path;
        } else if (slot.anyOf) {
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
        const cand = resolvePath(marketData, pth);
        if (placeholderValueOk(cand, pth)) {
          v = cand;
          usedPath = pth;
          break;
        }
      }
    } else if (slot.path) {
      v = resolvePath(marketData, slot.path);
      usedPath = slot.path;
    }
    if (placeholderValueOk(v, usedPath)) requiredFilled += 1;
  }
  if (requiredTotal === 0) return null;
  return requiredFilled / requiredTotal >= 0.85;
}

/**
 * Record fetch health for every panel in a market from its payload.
 */
export function publishMarketPayload(marketId, marketData, allMarkets = {}) {
  if (!marketId) return;
  const panels = MARKET_PANELS[marketId] || [];
  const entry = bus.get(marketId) || {};
  const now = Date.now();

  const allData = {};
  for (const [id, m] of Object.entries(allMarkets || {})) {
    allData[id] = m?.data !== undefined ? m.data : m;
  }
  if (marketData) allData[marketId] = marketData;

  for (const p of panels) {
    let fetchOk = false;
    let fieldValue = null;

    const ph = placeholderFetchOk(marketId, p.id, marketData, allData);
    if (ph != null) {
      fetchOk = ph;
    } else {
      const spec = getPanelFieldSpec(marketId, p.id);
      if (spec) {
        fieldValue = resolveOne(spec, marketData, allData);
        fetchOk = hasSubstance(fieldValue);
      } else {
        fetchOk = false;
      }
    }

    entry[p.id] = {
      fetchOk,
      samples: fetchOk ? collectNums(fieldValue) : [],
      fieldPath: getPanelFieldSpec(marketId, p.id)?.fieldPath || null,
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
