/**
 * Progressive KPI digest — small payload from /api/cache/digest/:marketId
 * while the full market bag is still loading.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const cache = new Map(); // marketId → { at, data }

export function useMarketDigest(marketId, { enabled = true, refreshKey = 0 } = {}) {
  const [digest, setDigest] = useState(() => cache.get(marketId)?.data || null);
  const [status, setStatus] = useState('idle'); // idle|loading|ok|error|disabled

  useEffect(() => {
    if (!enabled || !marketId) {
      setStatus('disabled');
      return undefined;
    }
    let cancelled = false;
    const hit = cache.get(marketId);
    if (hit && Date.now() - hit.at < 60_000 && refreshKey === 0) {
      setDigest(hit.data);
      setStatus('ok');
      return undefined;
    }
    setStatus('loading');
    api.get(`/api/cache/digest/${encodeURIComponent(marketId)}`)
      .then((body) => {
        if (cancelled) return;
        if (body?.ok === false || body?.error) {
          setStatus('error');
          return;
        }
        const payload = body?.digest || body;
        cache.set(marketId, { at: Date.now(), data: payload });
        setDigest(payload);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, [marketId, enabled, refreshKey]);

  return { digest, status };
}
