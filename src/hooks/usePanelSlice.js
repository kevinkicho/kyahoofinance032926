/**
 * Progressive panel slice — GET /api/panel/:market/:panel when full bag is empty.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const cache = new Map(); // key → { at, data }

export function usePanelSlice(marketId, panelId, { enabled = true } = {}) {
  const key = marketId && panelId ? `${marketId}:${panelId}` : '';
  const [slice, setSlice] = useState(() => (key && cache.get(key)?.data) || null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!enabled || !key) {
      setStatus('disabled');
      return undefined;
    }
    let cancelled = false;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 45_000) {
      setSlice(hit.data);
      setStatus(hit.data?.ok ? 'ok' : 'empty');
      return undefined;
    }
    setStatus('loading');
    api.get(`/api/panel/${encodeURIComponent(marketId)}/${encodeURIComponent(panelId)}`)
      .then((body) => {
        if (cancelled) return;
        cache.set(key, { at: Date.now(), data: body });
        setSlice(body);
        setStatus(body?.ok ? 'ok' : 'empty');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, [enabled, key, marketId, panelId]);

  return { slice, status };
}

/** Prefetch all catalog panels for a market (active-tab warm). */
export async function prefetchMarketPanelSlices(marketId, panelIds = []) {
  if (!marketId || !panelIds.length) return;
  await Promise.allSettled(
    panelIds.map(async (panelId) => {
      const key = `${marketId}:${panelId}`;
      if (cache.get(key) && Date.now() - cache.get(key).at < 45_000) return;
      try {
        const body = await api.get(`/api/panel/${encodeURIComponent(marketId)}/${encodeURIComponent(panelId)}`);
        cache.set(key, { at: Date.now(), data: body });
      } catch { /* ignore */ }
    }),
  );
}
