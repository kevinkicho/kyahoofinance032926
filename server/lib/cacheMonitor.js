/**
 * CacheMonitor — singleton that records cache fallback events and exposes
 * a report for the Analytics panel.
 *
 * Usage (server-side):
 *   import { cacheMonitor } from './lib/cacheMonitor.js';
 *   cacheMonitor.recordFallback('bonds', '/api/bonds', 45);
 *   const report = cacheMonitor.getReport();
 */
class CacheMonitor {
  constructor() {
    this._fallbacks = [];
    this._maxEntries = 50;
  }

  recordFallback(source, endpoint, durationMs) {
    this._fallbacks.unshift({
      source,
      endpoint,
      durationMs,
      timestamp: new Date().toISOString(),
    });
    if (this._fallbacks.length > this._maxEntries) {
      this._fallbacks.length = this._maxEntries;
    }
  }

  getReport() {
    const bySource = {};
    const byEndpoint = {};
    let totalFallbacks = 0;

    for (const entry of this._fallbacks) {
      totalFallbacks++;
      bySource[entry.source] = (bySource[entry.source] || 0) + 1;
      byEndpoint[entry.endpoint] = (byEndpoint[entry.endpoint] || 0) + 1;
    }

    return {
      totalFallbacks,
      bySource,
      byEndpoint,
      recent: this._fallbacks.slice(0, 50),
    };
  }

  reset() {
    this._fallbacks = [];
  }
}

export const cacheMonitor = new CacheMonitor();
