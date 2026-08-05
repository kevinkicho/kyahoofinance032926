/**
 * L2 panel paint — DOM display + confirm (visible / mounted panels).
 *
 * Bridge stamps may complete operational D/C for operator diagnostics but
 * never set true_ui. Product green requires natural paint + confirm match.
 */

import { ensureFetchMetricStamps, stampVisiblePaintedMetrics } from '../panelHealthStamp.js';
import { PAINT, VIA, CONFIRM } from './types.js';

/**
 * @typedef {object} PanelPaintResult
 * @property {boolean} displayOk operational (bridge may satisfy)
 * @property {boolean} confirmOk operational (bridge may satisfy)
 * @property {boolean} uiOk true UI only
 * @property {boolean} bridgeOnly
 * @property {string} displayDetail
 * @property {string} confirmDetail
 * @property {object|null} confirmMeta
 * @property {boolean} elPresent
 * @property {Element|null} el
 * @property {'n/a'|'missing'|'painting'|'true_ui'|'shell'|'mismatch'} paint
 * @property {'none'|'natural'|'bridge'} via
 * @property {'skipped'|'match'|'mismatch'} confirm
 * @property {string} [healthQuality] 'ui' | 'bridge' | null when operational complete
 * @property {object} display classify result
 */

/**
 * @param {object} args
 * @param {string} args.marketId
 * @param {string} args.panelId
 * @param {Element|null} args.el initial panel element
 * @param {boolean} args.fetchOk
 * @param {*} args.fieldValue
 * @param {*} args.stampSource
 * @param {boolean} [args.createShell=true] allow health-shell for operator bridge
 * @param {typeof import('../panelHealthEval.js').classifyPanelDisplay} args.classifyPanelDisplay
 * @param {typeof import('../panelHealthEval.js').confirmDisplayMatchesFetch} args.confirmDisplayMatchesFetch
 * @returns {PanelPaintResult}
 */
export function evaluatePanelPaint({
  marketId,
  panelId,
  el: initialEl,
  fetchOk,
  fieldValue,
  stampSource,
  createShell = true,
  classifyPanelDisplay,
  confirmDisplayMatchesFetch,
}) {
  let el = initialEl || null;

  // Promote already-painted body numbers → metric stamps (before bridge).
  if (el && !el.getAttribute?.('data-health-shell')) {
    try {
      stampVisiblePaintedMetrics(el);
    } catch { /* ignore */ }
  }

  let stamped = { ok: false, samples: [], el };
  if (fetchOk && stampSource != null) {
    try {
      const doc = typeof document !== 'undefined' ? document : null;
      stamped = ensureFetchMetricStamps(marketId, panelId, stampSource, doc, {
        force: true,
        createShell: !!createShell,
      });
      if (stamped?.el) el = stamped.el;
      if (!stamped || typeof stamped.ok !== 'boolean') {
        stamped = { ok: false, samples: [], el };
      }
      if (el && el.getAttribute?.('data-health-shell') !== '1') {
        try { stampVisiblePaintedMetrics(el); } catch { /* ignore */ }
      }
    } catch {
      stamped = { ok: false, samples: [], el };
    }
  }

  const isHealthShell = el?.getAttribute?.('data-health-shell') === '1';
  const hasBridgeNode = !!el?.querySelector?.('[data-health-bridge="1"]');

  const displayNatural = classifyPanelDisplay(el, { fetchOk });
  let naturalDisplayOk = displayNatural.ok;
  if (naturalDisplayOk && hasBridgeNode && el) {
    const content = el.querySelector?.('.bento-panel-content') || el;
    const allStamps = content.querySelectorAll?.('[data-metric-value]') || [];
    const nonBridgeStamps = [...allStamps].filter((n) => !n.closest?.('[data-health-bridge="1"]'));
    const chartOk = /chart series bound/i.test(displayNatural.detail || '');
    const cellOk = /table\/kpi cells/i.test(displayNatural.detail || '');
    if (!chartOk && !cellOk && nonBridgeStamps.length === 0) {
      naturalDisplayOk = false;
    }
  }
  if (isHealthShell) naturalDisplayOk = false;

  let displayOk = false;
  let displayDetail = '';
  let display = { ok: false, detail: 'n/a', kind: 'missing' };
  let bridgeOnly = false;

  if (fetchOk && stamped.ok && el) {
    if (naturalDisplayOk) {
      displayOk = true;
      displayDetail = displayNatural.detail;
      display = { ok: true, detail: displayDetail, kind: 'ok' };
    } else {
      displayOk = true;
      bridgeOnly = true;
      displayDetail = `health bridge only (${stamped.samples.length} stamp(s); no real UI metrics)`;
      display = { ok: true, detail: displayDetail, kind: 'bridge' };
    }
  } else {
    display = displayNatural;
    displayOk = display.ok;
    displayDetail = display.detail;
  }

  let confirmOk = false;
  let confirmDetail = '';
  let confirmMeta = null;
  if (!el) {
    confirmDetail = 'skipped — panel not in DOM';
  } else if (!fetchOk) {
    confirmDetail = 'skipped — fetch stream empty/failed';
  } else if (stamped.ok && stamped.samples.length > 0 && bridgeOnly) {
    confirmOk = true;
    confirmDetail = `confirmed ${stamped.samples.length} sample(s) via health bridge (not visible UI)`;
    confirmMeta = {
      ok: true,
      detail: confirmDetail,
      matched: stamped.samples.length,
      samples: stamped.samples.length,
      via: 'data-health-bridge',
    };
  } else if (stamped.ok && stamped.samples.length > 0 && !naturalDisplayOk) {
    confirmOk = true;
    bridgeOnly = true;
    confirmDetail = `confirmed ${stamped.samples.length} sample(s) via health bridge (not visible UI)`;
    confirmMeta = {
      ok: true,
      detail: confirmDetail,
      matched: stamped.samples.length,
      samples: stamped.samples.length,
      via: 'data-health-bridge',
    };
  } else if (!displayOk) {
    confirmDetail = 'skipped — UI not displaying data';
  } else {
    confirmMeta = confirmDisplayMatchesFetch(el, fieldValue);
    confirmOk = confirmMeta.ok;
    confirmDetail = confirmMeta.detail;
    if (confirmOk && confirmMeta?.via === 'data-metric-value' && hasBridgeNode && !naturalDisplayOk) {
      bridgeOnly = true;
    }
  }

  const uiOk = !!(
    fetchOk
    && naturalDisplayOk
    && !isHealthShell
    && confirmOk
    && !bridgeOnly
    && confirmMeta?.via !== 'data-health-bridge'
  );

  /** @type {PanelPaintResult['paint']} */
  let paint = PAINT.NA;
  /** @type {PanelPaintResult['via']} */
  let via = VIA.NONE;
  /** @type {PanelPaintResult['confirm']} */
  let confirm = CONFIRM.SKIPPED;

  if (uiOk) {
    paint = PAINT.TRUE_UI;
    via = VIA.NATURAL;
    confirm = CONFIRM.MATCH;
  } else if (bridgeOnly && fetchOk && (displayOk || confirmOk)) {
    paint = PAINT.SHELL;
    via = VIA.BRIDGE;
    confirm = confirmOk ? CONFIRM.MATCH : CONFIRM.SKIPPED;
  } else if (fetchOk && displayOk && !confirmOk && el) {
    paint = PAINT.MISMATCH;
    via = VIA.NATURAL;
    confirm = CONFIRM.MISMATCH;
  } else if (fetchOk && el && !displayOk) {
    const hardEmpty = /disabled|empty shell|empty-state|hollow body/i.test(displayDetail);
    paint = hardEmpty ? PAINT.SHELL : PAINT.PAINTING;
    via = VIA.NONE;
  } else if (fetchOk && !el) {
    paint = PAINT.MISSING;
    via = VIA.NONE;
  } else if (!fetchOk) {
    paint = PAINT.NA;
    via = VIA.NONE;
  } else {
    paint = PAINT.PAINTING;
    via = VIA.NONE;
  }

  const operationalComplete = !!(fetchOk && displayOk && confirmOk);
  const healthQuality = operationalComplete
    ? (uiOk ? 'ui' : (bridgeOnly || !naturalDisplayOk ? 'bridge' : 'ui'))
    : null;

  return {
    displayOk,
    confirmOk,
    uiOk,
    bridgeOnly: !!(operationalComplete && (bridgeOnly || healthQuality === 'bridge')),
    displayDetail,
    confirmDetail,
    confirmMeta,
    elPresent: !!el,
    el,
    paint,
    via,
    confirm,
    healthQuality,
    display,
    naturalDisplayOk,
    isHealthShell,
  };
}
