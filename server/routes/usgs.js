// USGS — recent significant earthquakes.
//
// Source: earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson
// Returns a GeoJSON FeatureCollection of M4.5+ events from the past month.
// No key, no rate limits. We surface a flat list of events plus magnitude
// histogram for the panel.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

// Significant events (M4.5+) over the past month — large enough to be
// economically relevant, small enough to keep the payload light.
const FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson';

function mapEvent(f) {
  const p = f.properties || {};
  const coords = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [];
  const lon = typeof coords[0] === 'number' ? coords[0] : null;
  const lat = typeof coords[1] === 'number' ? coords[1] : null;
  const depth = typeof coords[2] === 'number' ? Math.round(coords[2] * 10) / 10 : null;

  const timeMs = typeof p.time === 'number' ? p.time : null;
  const updatedMs = typeof p.updated === 'number' ? p.updated : null;
  const timeIso = timeMs != null ? new Date(timeMs).toISOString() : null;
  const updatedIso = updatedMs != null ? new Date(updatedMs).toISOString() : null;

  return {
    id: f.id || p.ids || null,
    // Timestamps (ISO for clients to format locally)
    time: timeIso,
    timeMs,
    updated: updatedIso,
    updatedMs,
    // Core fields
    mag: typeof p.mag === 'number' ? p.mag : null,
    magType: p.magType || null,
    place: p.place || p.title || '',
    title: p.title || p.place || '',
    depthKm: depth,
    lon,
    lat,
    // Alert / impact
    tsunami: p.tsunami === 1 || p.tsunami === true,
    felt: typeof p.felt === 'number' ? p.felt : null,
    cdi: typeof p.cdi === 'number' ? p.cdi : null, // community decimal intensity
    mmi: typeof p.mmi === 'number' ? p.mmi : null, // modified Mercalli intensity
    alert: p.alert || null, // green/yellow/orange/red
    sig: typeof p.sig === 'number' ? p.sig : null, // significance 0-1000
    // Network / quality
    net: p.net || null,
    code: p.code || null,
    status: p.status || null, // automatic / reviewed
    type: p.type || 'earthquake',
    nst: typeof p.nst === 'number' ? p.nst : null, // number of stations
    dmin: typeof p.dmin === 'number' ? Math.round(p.dmin * 1000) / 1000 : null,
    rms: typeof p.rms === 'number' ? Math.round(p.rms * 1000) / 1000 : null,
    gap: typeof p.gap === 'number' ? Math.round(p.gap * 10) / 10 : null,
    // Links
    url: p.url || null,
    detail: p.detail || null,
  };
}

router.get('/', async (req, res) => {
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
  if (!forceRefresh) {
    const cached = readDailyCache('usgs');
    if (cached) return res.json(cached);
  }

  const today = todayStr();
  let events = null;
  let magBuckets = null;
  let metadata = null;

  try {
    trackApiCall('USGS');
    const data = await fetchJSON(FEED_URL);
    const features = Array.isArray(data?.features) ? data.features : [];
    metadata = data?.metadata
      ? {
          generated: data.metadata.generated
            ? new Date(data.metadata.generated).toISOString()
            : null,
          title: data.metadata.title || null,
          url: data.metadata.url || FEED_URL,
          count: data.metadata.count ?? features.length,
        }
      : null;

    if (features.length) {
      events = features
        .map(mapEvent)
        .filter((e) => e.mag != null)
        .sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0));

      const buckets = { '4.5–4.9': 0, '5.0–5.9': 0, '6.0–6.9': 0, '7.0+': 0 };
      for (const e of events) {
        if (e.mag < 5) buckets['4.5–4.9']++;
        else if (e.mag < 6) buckets['5.0–5.9']++;
        else if (e.mag < 7) buckets['6.0–6.9']++;
        else buckets['7.0+']++;
      }
      magBuckets = Object.entries(buckets).map(([range, count]) => ({ range, count }));
    }
  } catch (e) {
    console.warn('[USGS]', e.message || e);
  }

  const _sources = { usgs: !!(events && events.length) };
  const isLive = _sources.usgs;

  const result = {
    events: events ? events.slice(0, 40) : null,
    eventsCount: events?.length || 0,
    magBuckets,
    biggest: events ? [...events].sort((a, b) => (b.mag || 0) - (a.mag || 0))[0] : null,
    metadata,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('usgs', result);
  else {
    const fb = readLatestCache('usgs');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
