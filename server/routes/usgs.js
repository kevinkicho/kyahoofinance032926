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

router.get('/', async (_req, res) => {
  const cached = readDailyCache('usgs');
  if (cached) return res.json(cached);

  const today = todayStr();
  let events = null, magBuckets = null;

  try {
    trackApiCall('USGS');
    const data = await fetchJSON(FEED_URL);
    const features = Array.isArray(data?.features) ? data.features : [];
    if (features.length) {
      events = features.map(f => ({
        id:       f.id,
        time:     f.properties?.time ? new Date(f.properties.time).toISOString() : null,
        mag:      typeof f.properties?.mag === 'number' ? f.properties.mag : null,
        place:    f.properties?.place || '',
        depthKm:  Array.isArray(f.geometry?.coordinates) && typeof f.geometry.coordinates[2] === 'number' ? Math.round(f.geometry.coordinates[2] * 10) / 10 : null,
        lon:      f.geometry?.coordinates?.[0] ?? null,
        lat:      f.geometry?.coordinates?.[1] ?? null,
        tsunami:  f.properties?.tsunami === 1,
        url:      f.properties?.url || null,
      })).filter(e => e.mag != null);
      // Magnitude histogram by full-magnitude bucket (4, 5, 6, 7+).
      const buckets = { '4.5–4.9': 0, '5.0–5.9': 0, '6.0–6.9': 0, '7.0+': 0 };
      for (const e of events) {
        if (e.mag < 5) buckets['4.5–4.9']++;
        else if (e.mag < 6) buckets['5.0–5.9']++;
        else if (e.mag < 7) buckets['6.0–6.9']++;
        else buckets['7.0+']++;
      }
      magBuckets = Object.entries(buckets).map(([range, count]) => ({ range, count }));
    }
  } catch (e) { console.warn('[USGS]', e.message || e); }

  const _sources = { usgs: !!(events && events.length) };
  const isLive = _sources.usgs;

  const result = {
    events: events ? events.slice(0, 30) : null,
    eventsCount: events?.length || 0,
    magBuckets,
    biggest: events ? [...events].sort((a, b) => (b.mag || 0) - (a.mag || 0))[0] : null,
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
