import { readDailyCacheAsync, writeDailyCacheAsync, readLatestCacheAsync, todayStr, mergeWithPreviousCache } from './cache.js';
import { sendCachedOrDegraded, classifyUpstreamError } from './marketResponse.js';
import { sanitizeMarketPayload } from './dataHygiene.js';

/**
 * Creates a standard Express route handler with caching and fallback capabilities.
 *
 * Market data routes always respond HTTP 200:
 *   - live payload when fetch succeeds
 *   - prior disk/memory cache when upstream is rate-limited / times out / fails
 *   - degraded shell only when no cache exists at all
 *
 * @param {Object} config
 * @param {string} config.marketName - The name of the market for cache file naming (e.g. 'bonds')
 * @param {string} config.cacheKey - The key used for memory cache
 * @param {number} [config.cacheTtl=900] - Cache TTL in seconds
 * @param {function} config.fetchDataFn - Async function to fetch new data: async (req, errors) => resultObject
 * @param {function} [config.buildSourcesFn] - Optional function to build data sources description from data object
 * @param {number} [config.timeoutMs] - Optional route timeout in milliseconds
 */
export function makeCachedRouteHandler({
  marketName,
  cacheKey,
  cacheTtl = 900,
  fetchDataFn,
  buildSourcesFn,
  timeoutMs,
}) {
  return async (req, res) => {
    const today = todayStr();
    const cache = req.app.locals.cache;
    const forceRefresh = req.query?.refresh === 'true' || req.query?.refresh === '1';

    // 1. Try daily async cache file (skip when client requests a live refresh)
    if (!forceRefresh) {
      try {
        const daily = await readDailyCacheAsync(marketName);
        if (daily) {
          const clean = sanitizeMarketPayload(daily);
          const sources = buildSourcesFn ? buildSourcesFn(clean) : undefined;
          return res.json({
            ...clean,
            fetchedOn: today,
            isCurrent: true,
            isLive: true,
            _cacheSource: 'daily_file',
            ...(sources ? { _sources: sources } : {}),
          });
        }
      } catch (e) {
        console.warn(`[routeFactory] Daily cache read failed for ${marketName}:`, e.message);
      }

      // 2. Try in-memory cache
      if (cache) {
        const cached = cache.get(cacheKey);
        if (cached) {
          const clean = sanitizeMarketPayload(cached);
          const sources = buildSourcesFn ? buildSourcesFn(clean) : undefined;
          return res.json({
            ...clean,
            fetchedOn: today,
            isCurrent: true,
            isLive: true,
            _cacheSource: 'memory',
            ...(sources ? { _sources: sources } : {}),
          });
        }
      }
    } else if (cache) {
      cache.del(cacheKey);
    }

    const _errors = {};
    let routeTimer;
    let responded = false;

    const respondOnce = async (error, reason) => {
      if (responded || res.headersSent) return;
      responded = true;
      if (routeTimer) clearTimeout(routeTimer);
      await sendCachedOrDegraded(res, marketName, {
        error: error || new Error(reason || `${marketName} unavailable`),
        memoryCache: cache,
        cacheKey,
        async: true,
        extra: {
          _errors,
          ...(reason ? { _timeout: reason === 'timeout' } : {}),
          ...(reason === 'timeout' ? { _cacheSource: 'timeout_fallback' } : {}),
        },
      });
    };

    // Setup custom response timeout if configured — always 200 via cache/shell
    if (timeoutMs) {
      routeTimer = setTimeout(() => {
        console.warn(`[routeFactory] Timeout reached for ${marketName} — responding with fallback (200)`);
        respondOnce(new Error(`${marketName} upstream timeout`), 'timeout');
      }, timeoutMs);
    }

    try {
      // 3. Fetch data via caller-defined fetch logic
      const resultData = await fetchDataFn(req, _errors);

      // Guard against routes that build a payload but forget `return result`
      // (undefined spreads to {} and would poison the memory cache with an
      // empty shell for the full TTL).
      if (!resultData || typeof resultData !== 'object' || Array.isArray(resultData)) {
        throw new Error(`${marketName} fetchDataFn returned empty/invalid payload`);
      }
      const payloadKeys = Object.keys(resultData).filter(k => !k.startsWith('_') && k !== 'lastUpdated' && k !== 'fetchedOn' && k !== 'isLive' && k !== 'isCurrent');
      const hasSubstance = payloadKeys.some(k => {
        const v = resultData[k];
        if (v == null || v === false) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return true;
      });
      if (!hasSubstance) {
        // Prefer merge-with-cache before failing: partial upstream success may
        // still leave usable fields from a prior day.
        const mergedEmpty = mergeWithPreviousCache(marketName, resultData);
        const mergedKeys = Object.keys(mergedEmpty).filter(k => !k.startsWith('_') && k !== 'lastUpdated' && k !== 'fetchedOn');
        const mergedHasSubstance = mergedKeys.some(k => {
          const v = mergedEmpty[k];
          if (v == null || v === false) return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'object') return Object.keys(v).length > 0;
          return true;
        });
        if (mergedHasSubstance) {
          const result = sanitizeMarketPayload({ ...mergedEmpty, lastUpdated: today });
          await writeDailyCacheAsync(marketName, result);
          if (cache) cache.set(cacheKey, result, cacheTtl);
          if (routeTimer) clearTimeout(routeTimer);
          if (!res.headersSent && !responded) {
            responded = true;
            const sources = buildSourcesFn ? buildSourcesFn(result) : undefined;
            return res.json({
              ...result,
              fetchedOn: today,
              isCurrent: false,
              isLive: false,
              _errors,
              _cacheSource: 'merged_previous',
              _rateLimited: Object.values(_errors).some(m =>
                /429|403|rate.?limit|throttl/i.test(String(m))
              ),
              ...(sources ? { _sources: sources } : {}),
            });
          }
          return;
        }
        throw new Error(`${marketName} fetchDataFn returned no usable fields`);
      }

      const result = sanitizeMarketPayload({
        ...mergeWithPreviousCache(marketName, resultData),
        lastUpdated: today,
      });

      // 4. Save to daily file cache & memory cache
      await writeDailyCacheAsync(marketName, result);
      if (cache) {
        cache.set(cacheKey, result, cacheTtl);
      }

      if (routeTimer) clearTimeout(routeTimer);
      if (!res.headersSent && !responded) {
        responded = true;
        const sources = buildSourcesFn ? buildSourcesFn(result) : undefined;
        const rateLimited = Object.values(_errors).some(m =>
          /429|403|rate.?limit|throttl/i.test(String(m))
        );
        res.json({
          ...result,
          fetchedOn: today,
          isCurrent: true,
          isLive: true,
          _errors,
          _cacheSource: 'live',
          ...(rateLimited ? { _rateLimited: true } : {}),
          ...(sources ? { _sources: sources } : {}),
        });
      }
    } catch (error) {
      if (routeTimer) clearTimeout(routeTimer);
      if (res.headersSent || responded) return;
      const info = classifyUpstreamError(error);
      console.error(`[routeFactory] ${marketName} API error (${info.kind}):`, error?.message || error);
      await respondOnce(error, info.kind);
    }
  };
}
