/**
 * Panel health signal state machine (topbar dropdown dots).
 *
 * Presentation policy lives in hub/lib/health/present.js (toTopbarDot).
 * This module re-exports that policy and keeps DOM helpers
 * (isMarketTabVisible, findScopedPanelEl).
 *
 * Color contract (honest — no bridge greens):
 *   green  (verified / ok)  — active visible tab + true UI (uiOk), not bridge-only
 *   amber  (bridge)         — open tab, F/D/C only via health-bridge stamps
 *   amber  (loading/stale)  — market loading, or stale payload with usable display
 *   grey   (pending)        — fetch ready but tab closed OR still painting
 *   red    (failed / null)  — fetch failed after load, OR open tab settled empty
 *
 * Legacy operational `displayOk`/`confirmOk` can be true from hidden bridge
 * stamps. Product green requires `uiOk === true` (or equivalent non-bridge
 * natural paint). Never treat `status === 'ok'` alone as verified.
 */

import { factsFromReport, PAINT, VIA } from './health/types.js';
import { toTopbarDot } from './health/present.js';

/**
 * @typedef {object} HealthReport
 * @property {string} [status]
 * @property {boolean} [fetchOk]
 * @property {boolean} [displayOk]
 * @property {boolean} [confirmOk]
 * @property {boolean} [uiOk]
 * @property {boolean} [bridgeOnly]
 * @property {string} [healthQuality]
 * @property {boolean} [elPresent]
 * @property {string} [fetchDetail]
 * @property {string} [displayDetail]
 * @property {string} [confirmDetail]
 * @property {boolean} [isLive]
 * @property {boolean} [isCurrent]
 */

/**
 * @typedef {object} PanelSignal
 * @property {'verified'|'bridge'|'loading'|'pending'|'failed'|'stale'} kind
 * @property {string} status   — legacy status string for callers
 * @property {string} color    — ok|bridge|loading|pending|null|stale
 * @property {string} tooltip
 * @property {boolean} fetchOk
 * @property {boolean} displayOk
 * @property {boolean} confirmOk
 * @property {boolean} [uiOk]
 * @property {boolean} [bridgeOnly]
 * @property {HealthReport} report
 */

/** True when report is operational ok only via health-bridge / shell. */
export function isBridgeOnlyReport(report) {
  if (!report || typeof report !== 'object') return false;
  if (report.uiOk === true || report.healthQuality === 'ui') return false;
  if (report.bridgeOnly === true || report.healthQuality === 'bridge') return true;
  const health = report.health || factsFromReport(report);
  if (health.via === VIA.BRIDGE) return true;
  // Operational ok with explicit uiOk false
  if (report.status === 'ok' && report.uiOk === false) return true;
  // Hidden shell mounts are never true UI
  if (report.elPresent && /health bridge only|health-shell|data-health-shell/i.test(String(report.displayDetail || ''))) {
    return true;
  }
  return false;
}

/** True UI paint proven (not bridge). */
export function isTrueUiReport(report) {
  if (!report || typeof report !== 'object') return false;
  if (report.uiOk === true || report.healthQuality === 'ui') return true;
  const health = report.health || factsFromReport(report);
  if (health.paint === PAINT.TRUE_UI && health.via === VIA.NATURAL) return true;
  if (report.uiOk === false || isBridgeOnlyReport(report)) return false;
  // Legacy reports (pre-uiOk field): operational ok without bridge markers.
  if (
    report.status === 'ok'
    && report.fetchOk
    && report.displayOk
    && report.confirmOk
    && !/health bridge only|health-shell/i.test(String(report.displayDetail || ''))
  ) {
    return true;
  }
  return false;
}

/**
 * Pure signal derivation — unit-test this, not the React hook.
 * Delegates to hub/lib/health/present.toTopbarDot (single presentation policy).
 *
 * @param {HealthReport|null|undefined} report
 * @param {{ tabVisible: boolean, marketLoading?: boolean, marketHasPayload?: boolean }} ctx
 * @returns {PanelSignal}
 */
export function derivePanelSignal(report, ctx = {}) {
  return toTopbarDot(report, ctx);
}

/**
 * Visible hub tab only (not display:none visited roots, not splash).
 */
export function isMarketTabVisible(marketId, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !marketId) return false;
  const root = doc.querySelector(`[data-market-id="${marketId}"]`);
  if (!root) return false;
  if (typeof window === 'undefined' || !window.getComputedStyle) return true;
  const style = window.getComputedStyle(root);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = root.getBoundingClientRect?.();
  if (rect && rect.width === 0 && rect.height === 0) return false;
  return true;
}

/**
 * Find panel node. Never steal another market's panel id (kpi, metrics, …).
 */
export function findScopedPanelEl(marketId, panelId, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !marketId || !panelId) return null;
  const live = doc.querySelector(`[data-market-id="${marketId}"] [data-panel-key="${panelId}"]`);
  if (live) return live;
  const splash = doc.querySelector(`[data-splash-market="${marketId}"] [data-panel-key="${panelId}"]`);
  if (splash) return splash;
  // If ANY hub market root exists, do not fall back to global panel-key search
  // (ids collide across markets: kpi, metrics, calendar, …).
  if (doc.querySelector('[data-market-id], [data-splash-market]')) {
    return null;
  }
  // Unit tests without market roots only
  return doc.querySelector(`[data-panel-key="${panelId}"]`);
}
