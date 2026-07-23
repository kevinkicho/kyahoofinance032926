/**
 * Always-200 market responses when upstream is rate-limited, timed out, or down.
 *
 * Clients (DataProvider / panels) expect HTTP 200 with either:
 *   - live payload (isLive: true)
 *   - cached payload (isLive: false, _cacheSource: 'error_fallback' | …)
 *   - degraded shell (isLive: false, _degraded: true) only when no cache exists
 *
 * Never return 5xx for market data endpoints — rate limits must not break the SPA.
 */

import { readLatestCache, readLatestCacheAsync, todayStr } from './cache.js';

export function classifyUpstreamError(error) {
  const msg = String(error?.message || error || '');
  const status = Number(error?.statusCode || error?.status || 0) || null;
  if (status === 429 || /HTTP\s*429|rate[\s_-]?limit|too many requests|throttl/i.test(msg)) {
    return { kind: 'rate_limit', status: status || 429, retryable: true, message: msg };
  }
  if (status === 403 || /HTTP\s*403/.test(msg)) {
    // FRED often answers 403 when the free tier is exhausted or UA blocked.
    return { kind: 'forbidden', status: 403, retryable: true, message: msg };
  }
  if (status === 504 || /timeout|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(msg)) {
    return { kind: 'timeout', status: status || 504, retryable: true, message: msg };
  }
  if (status && status >= 500) {
    return { kind: 'upstream_5xx', status, retryable: true, message: msg };
  }
  return { kind: 'error', status: status || 500, retryable: false, message: msg };
}

/**
 * Build a minimal shell so the client always gets a JSON body on 200.
 * Panels render "—" when fields are null; they should not see hard failures.
 */
export function buildDegradedShell(marketName, error, extra = {}) {
  const info = classifyUpstreamError(error);
  return {
    lastUpdated: todayStr(),
    fetchedOn: todayStr(),
    isCurrent: false,
    isLive: false,
    _degraded: true,
    _cacheSource: 'degraded_shell',
    _errorKind: info.kind,
    _rateLimited: info.kind === 'rate_limit' || info.kind === 'forbidden',
    _errors: {
      ...(extra._errors || {}),
      _route: info.message || `${marketName} unavailable`,
    },
    error: info.message || `${marketName} unavailable`,
    ...extra,
  };
}

/**
 * Prefer disk cache → optional memory cache → degraded shell. Always HTTP 200.
 *
 * @param {import('express').Response} res
 * @param {string} marketName - datacache key (e.g. 'bonds', 'commodities_enhanced')
 * @param {object} [opts]
 * @param {Error|string} [opts.error]
 * @param {object} [opts.memoryCache] - node-cache instance
 * @param {string} [opts.cacheKey]
 * @param {object} [opts.extra] - extra fields merged into the response
 * @param {boolean} [opts.async] - use async disk read
 */
export async function sendCachedOrDegraded(res, marketName, opts = {}) {
  if (res.headersSent) return;

  const { error, memoryCache, cacheKey, extra = {}, async: useAsync = false } = opts;
  const info = classifyUpstreamError(error);

  const today = todayStr();

  // 1. Latest on-disk cache (any recent day)
  try {
    const fallback = useAsync
      ? await readLatestCacheAsync(marketName)
      : readLatestCache(marketName);
    if (fallback?.data) {
      const fromToday = fallback.fetchedOn === today;
      return res.json({
        ...fallback.data,
        ...extra,
        fetchedOn: fallback.fetchedOn,
        // Today's disk cache still counts as "current for the day" even when
        // a live refresh was rate-limited — panels show 7/23, not blank.
        isCurrent: fromToday,
        isLive: false,
        _cacheSource: fromToday ? 'today_cache_fallback' : 'error_fallback',
        _errorKind: info.kind,
        _rateLimited: info.kind === 'rate_limit' || info.kind === 'forbidden',
        _errors: {
          ...(fallback.data._errors || {}),
          ...(extra._errors || {}),
          _route: info.message || undefined,
        },
      });
    }
  } catch (e) {
    console.warn(`[marketResponse] cache read failed for ${marketName}:`, e?.message);
  }

  // 2. In-memory cache (may still hold a prior successful payload)
  if (memoryCache && cacheKey) {
    try {
      const cached = memoryCache.get(cacheKey);
      if (cached && typeof cached === 'object') {
        const fo = String(cached.fetchedOn || cached.lastUpdated || today).slice(0, 10);
        return res.json({
          ...cached,
          ...extra,
          fetchedOn: fo,
          isCurrent: fo === today,
          isLive: false,
          _cacheSource: 'memory_fallback',
          _errorKind: info.kind,
          _rateLimited: info.kind === 'rate_limit' || info.kind === 'forbidden',
        });
      }
    } catch { /* ignore */ }
  }

  // 3. Degraded shell — still 200 so the SPA never hard-fails
  console.warn(
    `[marketResponse] ${marketName}: no cache; returning degraded 200 (${info.kind})`
  );
  return res.json(buildDegradedShell(marketName, error, extra));
}

/** Sync variant for routes that already use sync cache helpers. */
export function sendCachedOrDegradedSync(res, marketName, opts = {}) {
  if (res.headersSent) return;

  const { error, memoryCache, cacheKey, extra = {} } = opts;
  const info = classifyUpstreamError(error);
  const today = todayStr();

  try {
    const fallback = readLatestCache(marketName);
    if (fallback?.data) {
      const fromToday = fallback.fetchedOn === today;
      return res.json({
        ...fallback.data,
        ...extra,
        fetchedOn: fallback.fetchedOn,
        isCurrent: fromToday,
        isLive: false,
        _cacheSource: fromToday ? 'today_cache_fallback' : 'error_fallback',
        _errorKind: info.kind,
        _rateLimited: info.kind === 'rate_limit' || info.kind === 'forbidden',
        _errors: {
          ...(fallback.data._errors || {}),
          ...(extra._errors || {}),
          _route: info.message || undefined,
        },
      });
    }
  } catch (e) {
    console.warn(`[marketResponse] cache read failed for ${marketName}:`, e?.message);
  }

  if (memoryCache && cacheKey) {
    try {
      const cached = memoryCache.get(cacheKey);
      if (cached && typeof cached === 'object') {
        const fo = String(cached.fetchedOn || cached.lastUpdated || today).slice(0, 10);
        return res.json({
          ...cached,
          ...extra,
          fetchedOn: fo,
          isCurrent: fo === today,
          isLive: false,
          _cacheSource: 'memory_fallback',
          _errorKind: info.kind,
          _rateLimited: info.kind === 'rate_limit' || info.kind === 'forbidden',
        });
      }
    } catch { /* ignore */ }
  }

  console.warn(
    `[marketResponse] ${marketName}: no cache; returning degraded 200 (${info.kind})`
  );
  return res.json(buildDegradedShell(marketName, error, extra));
}
