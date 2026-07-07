import { readDailyCacheAsync, writeDailyCacheAsync, readLatestCacheAsync, todayStr } from './cache.js';

/**
 * Creates a standard Express route handler with caching and fallback capabilities.
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

    // 1. Try daily async cache file
    try {
      const daily = await readDailyCacheAsync(marketName);
      if (daily) {
        const sources = buildSourcesFn ? buildSourcesFn(daily) : undefined;
        return res.json({
          ...daily,
          fetchedOn: today,
          isCurrent: true,
          isLive: true,
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
        const sources = buildSourcesFn ? buildSourcesFn(cached) : undefined;
        return res.json({
          ...cached,
          fetchedOn: today,
          isCurrent: true,
          isLive: true,
          ...(sources ? { _sources: sources } : {}),
        });
      }
    }

    const _errors = {};
    let routeTimer;

    // Setup custom response timeout if configured
    if (timeoutMs) {
      routeTimer = setTimeout(async () => {
        if (!res.headersSent) {
          console.warn(`[routeFactory] Timeout reached for ${marketName} — responding with fallback`);
          const fallback = await readLatestCacheAsync(marketName);
          if (fallback) {
            return res.json({
              ...fallback.data,
              fetchedOn: fallback.fetchedOn,
              isCurrent: false,
              isLive: false,
              _timeout: true,
            });
          }
          res.status(504).json({ error: `${marketName} upstream timeout`, isCurrent: false, isLive: false });
        }
      }, timeoutMs);
    }

    try {
      // 3. Fetch data via caller-defined fetch logic
      const resultData = await fetchDataFn(req, _errors);

      const result = {
        ...resultData,
        lastUpdated: today,
      };

      // 4. Save to daily file cache & memory cache
      await writeDailyCacheAsync(marketName, result);
      if (cache) {
        cache.set(cacheKey, result, cacheTtl);
      }

      if (routeTimer) clearTimeout(routeTimer);
      if (!res.headersSent) {
        const sources = buildSourcesFn ? buildSourcesFn(result) : undefined;
        res.json({
          ...result,
          fetchedOn: today,
          isCurrent: true,
          isLive: true,
          _errors,
          ...(sources ? { _sources: sources } : {}),
        });
      }
    } catch (error) {
      if (routeTimer) clearTimeout(routeTimer);
      if (res.headersSent) return;
      console.error(`[routeFactory] ${marketName} API error:`, error);

      try {
        const fallback = await readLatestCacheAsync(marketName);
        if (fallback) {
          return res.json({
            ...fallback.data,
            fetchedOn: fallback.fetchedOn,
            isCurrent: false,
            isLive: false,
          });
        }
      } catch (fallbackError) {
        console.error(`[routeFactory] Fallback read failed for ${marketName}:`, fallbackError.message);
      }

      res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
    }
  };
}
