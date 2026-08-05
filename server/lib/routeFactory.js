import {
  readBestAvailableCache,
  writeDailyCacheAsync,
  readLatestCacheAsync,
  todayStr,
  mergeWithPreviousCache,
  isStructurallyHollow,
  withCacheProvenance,
} from './cache.js';
import { sendCachedOrDegraded, classifyUpstreamError } from './marketResponse.js';
import { sanitizeMarketPayload } from './dataHygiene.js';
import {
  resolveMarketServePolicy,
  shouldPersistLiveResult,
} from './marketServePolicy.js';

/**
 * Creates a standard Express route handler with cache-serve default.
 *
 * Default path (user page load):
 *   best non-hollow disk/GCS/memory bag → HTTP 200 (no upstream fan-out)
 *
 * Upstream runs only when:
 *   - no bag and MARKET_SERVE_MODE allows bootstrap, or
 *   - ?refresh=1 / X-Cache-Bypass (operator ▶ / warm job)
 *
 * Always HTTP 200 for market data. Never invents field values.
 *
 * @param {Object} config
 * @param {string} config.marketName
 * @param {string} config.cacheKey
 * @param {number} [config.cacheTtl=900]
 * @param {function} config.fetchDataFn
 * @param {function} [config.buildSourcesFn]
 * @param {number} [config.timeoutMs]
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
    const policy = resolveMarketServePolicy(req);

    const attachSources = (body, data) => {
      if (!buildSourcesFn) return body;
      try {
        const sources = buildSourcesFn(data);
        if (sources) body._sources = sources;
      } catch { /* ignore */ }
      return body;
    };

    const serveBag = (data, meta) => {
      const clean = sanitizeMarketPayload(data);
      const body = withCacheProvenance(clean, meta);
      body._servePolicy = policy.mode;
      body._serveReason = meta.serveReason || policy.reason;
      return res.json(attachSources(body, clean));
    };

    // ── 1. Cache serve (normal loads + cache-only) ──────────────────────
    // On forceRefresh, skipCache is true so readBestAvailableCache returns null;
    // we still try last-good AFTER live fails (error path).
    if (!policy.forceRefresh) {
      try {
        const best = await readBestAvailableCache(marketName);
        if (best?.data && !isStructurallyHollow(marketName, best.data)) {
          return serveBag(best.data, {
            fetchedOn: best.fetchedOn,
            isCurrent: best.isCurrent,
            isStale: best.isStale,
            isLive: false,
            source: best.source,
            hydratedFrom: best.hydratedFrom,
            serveReason: 'cache_hit',
          });
        }
      } catch (e) {
        console.warn(`[routeFactory] Best-available cache failed for ${marketName}:`, e.message);
      }

      if (cache) {
        const cached = cache.get(cacheKey);
        if (cached && !isStructurallyHollow(marketName, cached)) {
          const fo = String(cached.fetchedOn || cached.lastUpdated || today).slice(0, 10);
          return serveBag(cached, {
            fetchedOn: fo,
            isCurrent: fo === today,
            isStale: fo !== today,
            isLive: false,
            source: 'memory',
            serveReason: 'memory_hit',
          });
        }
        if (cached && isStructurallyHollow(marketName, cached)) {
          cache.del(cacheKey);
        }
      }

      // No bag: either bootstrap upstream or degraded (hard cache mode)
      if (!policy.allowUpstream) {
        return sendCachedOrDegraded(res, marketName, {
          error: new Error(`${marketName} cache miss (upstream disabled: ${policy.reason})`),
          memoryCache: cache,
          cacheKey,
          async: true,
          extra: {
            _servePolicy: policy.mode,
            _serveReason: 'cache_miss_no_upstream',
            _cacheSource: 'degraded_or_empty',
          },
        });
      }
    } else if (cache) {
      cache.del(cacheKey);
    }

    // ── 2. Upstream rebuild (miss bootstrap or force refresh) ───────────
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
          _servePolicy: policy.mode,
          _serveReason: reason || 'upstream_error',
          ...(reason === 'timeout' ? { _timeout: true, _cacheSource: 'timeout_fallback' } : {}),
        },
      });
    };

    if (timeoutMs) {
      routeTimer = setTimeout(() => {
        console.warn(`[routeFactory] Timeout ${marketName} — last-good fallback (200)`);
        respondOnce(new Error(`${marketName} upstream timeout`), 'timeout');
      }, timeoutMs);
    }

    try {
      const resultData = await fetchDataFn(req, _errors);

      if (!resultData || typeof resultData !== 'object' || Array.isArray(resultData)) {
        throw new Error(`${marketName} fetchDataFn returned empty/invalid payload`);
      }

      const payloadKeys = Object.keys(resultData).filter(
        (k) => !k.startsWith('_')
          && k !== 'lastUpdated'
          && k !== 'fetchedOn'
          && k !== 'isLive'
          && k !== 'isCurrent'
          && k !== 'isStale',
      );
      const hasSubstance = payloadKeys.some((k) => {
        const v = resultData[k];
        if (v == null || v === false) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return true;
      });

      if (!hasSubstance) {
        const mergedEmpty = mergeWithPreviousCache(marketName, resultData);
        const mergedKeys = Object.keys(mergedEmpty).filter(
          (k) => !k.startsWith('_') && k !== 'lastUpdated' && k !== 'fetchedOn',
        );
        const mergedHasSubstance = mergedKeys.some((k) => {
          const v = mergedEmpty[k];
          if (v == null || v === false) return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'object') return Object.keys(v).length > 0;
          return true;
        });
        if (mergedHasSubstance) {
          const result = sanitizeMarketPayload({ ...mergedEmpty, lastUpdated: today });
          // Prefer not to clobber a good day-file with a sparse merge on rebuild
          if (shouldPersistLiveResult(marketName, result, isStructurallyHollow)) {
            await writeDailyCacheAsync(marketName, result);
            if (cache) cache.set(cacheKey, result, cacheTtl);
          }
          if (routeTimer) clearTimeout(routeTimer);
          if (!res.headersSent && !responded) {
            responded = true;
            return serveBag(result, {
              fetchedOn: result.fetchedOn || today,
              isCurrent: false,
              isStale: true,
              isLive: false,
              source: 'merged_previous',
              serveReason: 'sparse_live_merged',
            });
          }
          return;
        }
        throw new Error(`${marketName} fetchDataFn returned no usable fields`);
      }

      let result = sanitizeMarketPayload({
        ...mergeWithPreviousCache(marketName, resultData),
        lastUpdated: today,
      });

      if (isStructurallyHollow(marketName, result)) {
        try {
          // Bypass skipCache for last-good read during force refresh
          const prior = await readLatestCacheAsync(marketName);
          if (prior?.data && !isStructurallyHollow(marketName, prior.data)) {
            // Prefer pure prior over hollow live — do not poison disk
            if (routeTimer) clearTimeout(routeTimer);
            if (!res.headersSent && !responded) {
              responded = true;
              return serveBag(prior.data, {
                fetchedOn: prior.fetchedOn,
                isCurrent: prior.fetchedOn === today,
                isStale: prior.fetchedOn !== today,
                isLive: false,
                source: 'prior_day_hollow_live',
                serveReason: 'live_hollow_kept_prior',
              });
            }
            return;
          }
        } catch { /* keep live */ }
      }

      // Persist only non-hollow rebuilds (never mock; never shrink good bags)
      if (shouldPersistLiveResult(marketName, result, isStructurallyHollow)) {
        await writeDailyCacheAsync(marketName, result);
        if (cache) cache.set(cacheKey, result, cacheTtl);
      }

      if (routeTimer) clearTimeout(routeTimer);
      if (!res.headersSent && !responded) {
        responded = true;
        const rateLimited = Object.values(_errors).some((m) =>
          /429|403|rate.?limit|throttl/i.test(String(m)),
        );
        const hollow = isStructurallyHollow(marketName, result);
        const body = withCacheProvenance(result, {
          fetchedOn: today,
          isCurrent: !hollow,
          isStale: hollow,
          isLive: !hollow && policy.forceRefresh,
          source: result._servedFromPriorCache ? 'prior_merge' : 'live',
        });
        body._errors = _errors;
        body._servePolicy = policy.mode;
        body._serveReason = policy.forceRefresh ? 'force_refresh_live' : 'bootstrap_live';
        if (hollow) body._hollow = true;
        if (rateLimited) body._rateLimited = true;
        res.json(attachSources(body, result));
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

export { resolveMarketServePolicy, getMarketServeMode } from './marketServePolicy.js';
