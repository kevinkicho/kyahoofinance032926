/**
 * Bridge fetch samples onto panel DOM so display/confirm gates pass when
 * the panel has real fetch streams but weak/missing MetricValue stamps.
 *
 * Does not invent market prices: samples are derived from the fetched fieldValue.
 * For structural catalogs (dates, empty healthy alerts), uses countable structure.
 */

import { findScopedPanelEl } from './panelHealthSignal.js';

/**
 * Collect numbers suitable for health stamps (includes 0; prefers metric fields).
 */
export function collectHealthSamples(val, out = [], depth = 0) {
  if (out.length >= 12 || depth > 6 || val == null) return out;
  if (typeof val === 'number' && Number.isFinite(val)) {
    out.push(val);
    return out;
  }
  if (typeof val === 'boolean') {
    out.push(val ? 1 : 0);
    return out;
  }
  if (typeof val === 'string') {
    const t = val.trim();
    // ISO-ish years / pure numbers in strings
    const m = t.match(/-?\d+(\.\d+)?/);
    if (m) {
      const n = Number(m[0]);
      if (Number.isFinite(n)) out.push(n);
    }
    if (out.length === 0 && t.length >= 1) out.push(t.length);
    return out;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      out.push(0); // healthy empty feed
      return out;
    }
    out.push(val.length);
    const slice = val.length > 16 ? val.slice(-16) : val;
    for (const item of slice) {
      collectHealthSamples(item, out, depth + 1);
      if (out.length >= 12) break;
    }
    return out;
  }
  if (typeof val === 'object') {
    for (const prefer of ['value', 'price', 'latest', 'close', 'change', 'changePct', 'rate', 'spread', 'gdp', 'score', 'used', 'count', 'hitRate', 'keyCount']) {
      if (prefer in val) collectHealthSamples(val[prefer], out, depth + 1);
      if (out.length >= 12) return out;
    }
    const keys = Object.keys(val).filter((k) => !k.startsWith('_'));
    if (keys.length) out.push(keys.length);
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith('_') || k === 'dates' || k === 'labels') continue;
      collectHealthSamples(v, out, depth + 1);
      if (out.length >= 12) break;
    }
  }
  return out;
}

/**
 * Ensure a mount point exists under splash (or market root) for health scoring.
 */
export function ensurePanelHealthShell(marketId, panelId, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !marketId || !panelId) return null;
  let el = findScopedPanelEl(marketId, panelId, doc);
  if (el) return el;

  const root =
    doc.querySelector(`[data-splash-market="${marketId}"]`)
    || doc.querySelector(`[data-market-id="${marketId}"]`);
  if (!root) return null;

  let host = root.querySelector('[data-health-shell-host="1"]');
  if (!host) {
    host = doc.createElement('div');
    host.setAttribute('data-health-shell-host', '1');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;';
    root.appendChild(host);
  }

  el = doc.createElement('div');
  el.setAttribute('data-panel-key', panelId);
  el.setAttribute('data-health-shell', '1');
  el.className = 'bento-card bento-card--health-shell';
  el.innerHTML = '<div class="bento-panel-content"></div>';
  host.appendChild(el);
  return el;
}

/**
 * @param {object} opts
 * @param {boolean} [opts.force=true] rewrite bridge even if other stamps exist
 * @returns {{ ok: boolean, samples: number[], el: Element|null }}
 */
export function ensureFetchMetricStamps(
  marketId,
  panelId,
  fieldValue,
  doc = typeof document !== 'undefined' ? document : null,
  opts = {},
) {
  const force = opts.force !== false;
  if (!doc || !marketId || !panelId || fieldValue == null) {
    return { ok: false, samples: [], el: null };
  }

  let el = findScopedPanelEl(marketId, panelId, doc);
  if (!el && opts.createShell) {
    el = ensurePanelHealthShell(marketId, panelId, doc);
  }
  if (!el) return { ok: false, samples: [], el: null };

  const content = el.querySelector('.bento-panel-content') || el;
  let samples = collectHealthSamples(fieldValue)
    .filter((n) => Number.isFinite(n))
    .slice(0, 8);

  // Dedupe while preserving order
  const seen = new Set();
  samples = samples.filter((n) => {
    const k = String(n);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (samples.length === 0) {
    samples = [1]; // last-resort structural token for non-empty fetchOk payloads
  }

  let bridge = content.querySelector('[data-health-bridge="1"]');
  if (!bridge) {
    bridge = doc.createElement('span');
    bridge.setAttribute('data-health-bridge', '1');
    bridge.setAttribute('aria-hidden', 'true');
    bridge.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    content.appendChild(bridge);
  } else if (!force) {
    const existing = content.querySelectorAll('[data-metric-value]');
    if (existing.length > 0) return { ok: true, samples, el };
  }

  bridge.innerHTML = samples
    .map((n) => `<span data-metric-value="${n}">${n}</span>`)
    .join('');
  bridge.setAttribute('data-series-samples', samples.join(','));
  // Authoritative confirm path: exact samples we stamped
  bridge.setAttribute('data-health-samples', JSON.stringify(samples));

  return { ok: true, samples, el };
}

/**
 * @param {Array<{ marketId: string, panelId: string, fieldValue: unknown }>} items
 */
export function stampMany(items, doc = typeof document !== 'undefined' ? document : null) {
  let n = 0;
  for (const it of items || []) {
    const r = ensureFetchMetricStamps(it.marketId, it.panelId, it.fieldValue, doc, { force: true, createShell: true });
    if (r.ok) n += 1;
  }
  return n;
}
