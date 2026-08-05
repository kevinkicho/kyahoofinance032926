/**
 * GET /api/panel/:marketId/:panelId
 * Returns a slim slice of the market cache for one panel (field-map driven).
 * Full bags stay on /api/{market}; this is for progressive / low-bandwidth paint.
 */
import { Router } from 'express';
import { readDailyCache, readLatestCache } from '../lib/cache.js';
import { PANEL_FIELD_MAP } from '../../src/data/panelFieldMap.js';
import { slicePanelPayload } from '../../shared/contracts/buildContracts.js';
import { MARKET_ENDPOINTS } from '../../src/hub/lib/marketEndpoints.js';

const router = Router();

/** Cache key aliases (disk names ≠ hub market ids). */
const CACHE_KEYS = {
  commodities: ['commodities_enhanced', 'commodities'],
  equitiesDeepDive: ['equityDeepDive', 'equitiesDeepDive'],
};

function loadMarketBag(marketId) {
  const keys = CACHE_KEYS[marketId] || [marketId];
  for (const k of keys) {
    const daily = readDailyCache(k);
    if (daily && typeof daily === 'object') return daily;
    const latest = readLatestCache(k);
    if (latest?.data && typeof latest.data === 'object') {
      return { ...latest.data, fetchedOn: latest.fetchedOn || latest.data.fetchedOn };
    }
  }
  return null;
}

router.get('/:marketId/:panelId', (req, res) => {
  const { marketId, panelId } = req.params;
  if (!marketId || !panelId) {
    return res.status(400).json({ ok: false, error: 'marketId and panelId required' });
  }
  if (!MARKET_ENDPOINTS[marketId] && marketId !== 'alerts') {
    // still allow if field map has entries
    const hasMap = Object.keys(PANEL_FIELD_MAP).some((k) => k.startsWith(`${marketId}:`));
    if (!hasMap) {
      return res.status(404).json({ ok: false, error: 'unknown_market' });
    }
  }

  const bag = loadMarketBag(marketId);
  if (!bag) {
    return res.status(404).json({
      ok: false,
      error: 'no_cache',
      marketId,
      panelId,
      hint: 'Warm /api/' + marketId + ' or wait for wave',
    });
  }

  const slice = slicePanelPayload(marketId, panelId, bag, PANEL_FIELD_MAP);
  const cross = (slice.missing || []).filter((m) => String(m).startsWith('crossMarket:'));
  const crossBags = {};
  for (const m of cross) {
    const depId = m.replace('crossMarket:', '');
    const dep = loadMarketBag(depId);
    if (!dep) continue;
    const depSpec = PANEL_FIELD_MAP[`${marketId}:${panelId}`];
    const specs = Array.isArray(depSpec?.anyOf) ? depSpec.anyOf : [depSpec];
    for (const s of specs || []) {
      if (s?.crossMarket !== depId) continue;
      const path = s.fieldPath || s.field;
      if (!path) continue;
      let cur = dep;
      for (const p of String(path).split('.')) cur = cur?.[p];
      if (cur != null) {
        slice.fields[`$cross.${depId}.${path}`] = cur;
        slice.ok = true;
      }
    }
    crossBags[depId] = { fetchedOn: dep.fetchedOn || null, hasData: true };
  }

  res.json({
    ok: !!slice.ok,
    ...slice,
    crossMarkets: crossBags,
    primary: MARKET_ENDPOINTS[marketId] || null,
    cacheSource: bag._cacheSource || 'disk',
  });
});

export default router;
