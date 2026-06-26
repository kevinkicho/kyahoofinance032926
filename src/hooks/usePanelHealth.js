import { useMemo, useState, useEffect, useRef } from 'react';
import { MARKET_PANELS } from '../data/marketPanels';

// Global cache populated by SplashScreen during initialization.
let _panelCache = {};
let _cacheVersion = 0;
const _listeners = new Set();

export function setPanelCache(cache) {
  _panelCache = cache || {};
  _cacheVersion++;
  _listeners.forEach(fn => fn());
}

export function getPanelCache() {
  return _panelCache;
}

// Reverse lookup: panel key → market ID
const PANEL_TO_MARKET = {};
for (const [mktId, panels] of Object.entries(MARKET_PANELS)) {
  for (const p of panels) PANEL_TO_MARKET[p.id] = mktId;
}

// Scan DOM and update cache for a specific market
function scanAndUpdateCache(marketId) {
  if (typeof document === 'undefined') return;
  const panels = MARKET_PANELS[marketId] || [];
  const panelIds = new Set(panels.map(p => p.id));
  const els = document.querySelectorAll('[data-panel-key]');
  let changed = false;
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key || !panelIds.has(key)) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    let status;
    if (/stale/i.test(footerText)) {
      status = 'stale';
    } else if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 200) {
      status = 'null';
    } else {
      status = 'ok';
    }
    if (_panelCache[marketId]?.[key] !== status) {
      if (!_panelCache[marketId]) _panelCache[marketId] = {};
      _panelCache[marketId][key] = status;
      changed = true;
    }
  });
  if (changed) {
    _cacheVersion++;
    _listeners.forEach(fn => fn());
  }
}

// Scan all markets from DOM
function scanAllFromDom() {
  if (typeof document === 'undefined') return;
  const els = document.querySelectorAll('[data-panel-key]');
  let changed = false;
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const mktId = PANEL_TO_MARKET[key];
    if (!mktId) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    let status;
    if (/stale/i.test(footerText)) {
      status = 'stale';
    } else if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 200) {
      status = 'null';
    } else {
      status = 'ok';
    }
    if (_panelCache[mktId]?.[key] !== status) {
      if (!_panelCache[mktId]) _panelCache[mktId] = {};
      _panelCache[mktId][key] = status;
      changed = true;
    }
  });
  if (changed) {
    _cacheVersion++;
    _listeners.forEach(fn => fn());
  }
}

// Global MutationObserver that continuously updates cache from DOM
let _observer = null;
function ensureObserver() {
  if (_observer || typeof document === 'undefined') return;
  _observer = new MutationObserver(() => scanAllFromDom());
  _observer.observe(document.body || document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['data-panel-key'], characterData: true,
  });
}

export function usePanelHealth(marketId) {
  // Ensure observer is running
  useEffect(() => {
    ensureObserver();
    return () => {};
  }, []);

  const [, forceUpdate] = useState(0);

  // Subscribe to cache changes
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  // Also scan this market's panels on mount / when market changes
  useEffect(() => {
    if (marketId) {
      scanAndUpdateCache(marketId);
    }
  }, [marketId]);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const cached = _panelCache[marketId] || {};
    const health = {};
    for (const p of panels) {
      health[p.id] = cached[p.id] || 'unknown';
    }
    return health;
  }, [marketId, _cacheVersion]);
}
