/**
 * Build market contracts from api-routing + panel field map.
 * Explicit v1 JSON files override auto-generated shells.
 */
import routing from '../api-routing.json' with { type: 'json' };
import equities from './equities.v1.json' with { type: 'json' };
import bonds from './bonds.v1.json' with { type: 'json' };

/** Explicit hand-authored contracts win over auto. */
export const EXPLICIT_CONTRACTS = {
  equities,
  bonds,
};

/**
 * @param {Record<string, Array<{ field?: string, fieldPath?: string, crossMarket?: string, anyOf?: object[] }>>} fieldMap
 */
export function buildContractsFromSources(fieldMap = {}) {
  const out = { ...EXPLICIT_CONTRACTS };
  const markets = routing.markets || {};
  const tabs = routing.tabMarkets || Object.keys(markets);

  for (const marketId of tabs) {
    if (out[marketId]) continue;
    const cfg = markets[marketId];
    if (!cfg?.primary) continue;

    const deps = (cfg.deps || [])
      .map((p) => {
        const path = String(p).replace(/\/$/, '');
        for (const [id, m] of Object.entries(markets)) {
          if (m.primary === path) return id;
        }
        // /api/foo/bar → try longest match
        return null;
      })
      .filter(Boolean);

    const panels = [];
    const fieldIds = new Set();
    for (const [key, spec] of Object.entries(fieldMap)) {
      if (!key.startsWith(`${marketId}:`)) continue;
      const panelId = key.slice(marketId.length + 1);
      const requiredFields = [];
      const specs = Array.isArray(spec.anyOf) ? spec.anyOf : [spec];
      for (const s of specs) {
        if (s.crossMarket) continue; // primary-market contract only
        const f = s.fieldPath || s.field;
        if (f) {
          const root = String(f).split('.')[0];
          requiredFields.push(root);
          fieldIds.add(root);
        }
      }
      panels.push({
        panelId,
        requiredFields: [...new Set(requiredFields)],
      });
    }

    const fields = [...fieldIds].map((id) => ({
      id,
      path: id,
      role: 'object',
      required: panels.some((p) => p.requiredFields.includes(id)),
    }));
    fields.push({ id: 'fetchedOn', path: 'fetchedOn', role: 'date', required: true });

    out[marketId] = {
      schemaId: `${marketId}.auto.v1`,
      marketId,
      primary: cfg.primary,
      description: `Auto contract from api-routing + panelFieldMap (${cfg.label || marketId})`,
      auto: true,
      fields,
      deps,
      digestKeys: [...fieldIds].slice(0, 8),
      panels,
    };
  }

  return out;
}

/** Resolve path on object (dot notation). */
export function resolvePath(obj, path) {
  if (obj == null || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Slice panel fields from a market payload using field map entry.
 * @returns {{ panelId: string, marketId: string, fields: object, missing: string[] }}
 */
export function slicePanelPayload(marketId, panelId, data, fieldMap = {}) {
  const key = `${marketId}:${panelId}`;
  const spec = fieldMap[key];
  const fields = {};
  const missing = [];
  if (!spec) {
    return {
      panelId,
      marketId,
      fields: {},
      missing: ['(no field map)'],
      fetchedOn: data?.fetchedOn || null,
    };
  }
  const candidates = Array.isArray(spec.anyOf) ? spec.anyOf : [spec];
  let hit = false;
  for (const s of candidates) {
    if (s.crossMarket) {
      // Cross-market slices need multi-bag; mark dependency only
      missing.push(`crossMarket:${s.crossMarket}`);
      continue;
    }
    const path = s.fieldPath || s.field;
    if (!path) continue;
    const v = resolvePath(data, path);
    if (v != null && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)) {
      fields[path] = v;
      hit = true;
      break;
    }
    missing.push(path);
  }
  return {
    panelId,
    marketId,
    fields,
    missing: hit ? missing.filter((m) => m.startsWith('crossMarket:')) : missing,
    ok: hit || Object.keys(fields).length > 0,
    fetchedOn: data?.fetchedOn || data?.fetchedAt || null,
    isLive: data?.isLive === true,
    isCurrent: data?.isCurrent === true,
  };
}
