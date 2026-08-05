/**
 * Market contracts — explicit v1 JSON + auto-generated from routing/field map.
 */
import { PANEL_FIELD_MAP } from '../../src/data/panelFieldMap.js';
import {
  EXPLICIT_CONTRACTS,
  buildContractsFromSources,
  resolvePath,
  slicePanelPayload,
} from './buildContracts.js';

/** @type {Record<string, object>} */
export const MARKET_CONTRACTS = buildContractsFromSources(PANEL_FIELD_MAP);

export function getMarketContract(marketId) {
  return MARKET_CONTRACTS[marketId] || null;
}

export function listContractMarketIds() {
  return Object.keys(MARKET_CONTRACTS);
}

/**
 * Validate a payload against contract required fields (shallow root paths).
 * @returns {{ ok: boolean, missing: string[], unknown?: boolean }}
 */
export function validateAgainstContract(marketId, data) {
  const c = getMarketContract(marketId);
  if (!c) return { ok: true, missing: [], unknown: true };
  if (!data || typeof data !== 'object') return { ok: false, missing: ['(no payload)'] };
  const missing = [];
  for (const f of c.fields || []) {
    if (f.required === false) continue;
    const path = f.path || f.id;
    const v = resolvePath(data, path);
    if (v == null || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)) {
      missing.push(path);
    }
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Extract digest keys listed on the contract from a full payload.
 * Used by server digest + progressive KPI bar.
 */
export function extractContractDigestFields(marketId, data) {
  const c = getMarketContract(marketId);
  if (!c || !data) return {};
  const out = {};
  for (const key of c.digestKeys || []) {
    // digestKeys may be logical names (usCurve) or payload roots
    const v = resolvePath(data, key);
    if (v != null) out[key] = v;
  }
  for (const f of c.fields || []) {
    if (f.role === 'series') continue; // never put full series in digest
    if (f.required || (c.digestKeys || []).includes(f.id)) {
      const v = resolvePath(data, f.path || f.id);
      if (v != null && typeof v !== 'object') out[f.id] = v;
      else if (v != null && typeof v === 'object' && !Array.isArray(v)) {
        // shallow numeric map only
        const slim = {};
        let n = 0;
        for (const [k, val] of Object.entries(v)) {
          if (typeof val === 'number' && Number.isFinite(val)) {
            slim[k] = val;
            if (++n >= 16) break;
          }
        }
        if (n) out[f.id] = slim;
      }
    }
  }
  return out;
}

export { EXPLICIT_CONTRACTS, resolvePath, slicePanelPayload };
export { PANEL_FIELD_MAP };
