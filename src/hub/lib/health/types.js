/**
 * Panel health fact model (L0 / L1 / L2).
 *
 * L0 market plane lives in HubFooter / DataProvider (not this module).
 * L1 panel data  — payload fill only (no DOM).
 * L2 panel paint — true UI vs bridge vs missing (DOM when available).
 *
 * Presentation (chip colors) lives in present.js — never set product green
 * from bridge-only paint or from closed-tab L2.
 */

/** @typedef {'unknown'|'waiting'|'ready'|'partial'|'empty'|'error'} DataState */
/** @typedef {'n/a'|'missing'|'painting'|'true_ui'|'shell'|'mismatch'} PaintState */
/** @typedef {'none'|'natural'|'bridge'} PaintVia */
/** @typedef {'skipped'|'match'|'mismatch'} ConfirmState */

/**
 * @typedef {object} PanelHealthFacts
 * @property {string} [marketId]
 * @property {string} [panelId]
 * @property {string} [title]
 * @property {DataState} data
 * @property {PaintState} paint
 * @property {PaintVia} via
 * @property {ConfirmState} confirm
 * @property {string} [reason] short human/code reason
 * @property {{ requiredFilled?: number, requiredTotal?: number, rate?: number }|null} [fill]
 * @property {boolean} [fetchOk] legacy mirror
 * @property {boolean} [uiOk] true only when paint===true_ui
 * @property {boolean} [bridgeOnly] true when via===bridge and operational D/C
 * @property {object|null} [source] original report for debugging
 */

export const DATA = Object.freeze({
  UNKNOWN: 'unknown',
  WAITING: 'waiting',
  READY: 'ready',
  PARTIAL: 'partial',
  EMPTY: 'empty',
  ERROR: 'error',
});

export const PAINT = Object.freeze({
  NA: 'n/a',
  MISSING: 'missing',
  PAINTING: 'painting',
  TRUE_UI: 'true_ui',
  SHELL: 'shell',
  MISMATCH: 'mismatch',
});

export const VIA = Object.freeze({
  NONE: 'none',
  NATURAL: 'natural',
  BRIDGE: 'bridge',
});

export const CONFIRM = Object.freeze({
  SKIPPED: 'skipped',
  MATCH: 'match',
  MISMATCH: 'mismatch',
});

/**
 * Derive layered facts from a legacy F/D/C report (or partial).
 * Pure — no DOM, no visibility. Presentation applies tabVisible separately.
 *
 * @param {object|null|undefined} report
 * @returns {PanelHealthFacts}
 */
export function factsFromReport(report) {
  if (!report || typeof report !== 'object') {
    return {
      data: DATA.UNKNOWN,
      paint: PAINT.NA,
      via: VIA.NONE,
      confirm: CONFIRM.SKIPPED,
      reason: 'no report',
      fill: null,
      fetchOk: false,
      uiOk: false,
      bridgeOnly: false,
      source: null,
    };
  }

  // Infer fetchOk from operational status / ui flags when callers omit it
  // (splash tallies often only pass status + uiOk/bridgeOnly).
  const fetchOk = !!report.fetchOk
    || report.status === 'ok'
    || report.status === 'stale'
    || report.uiOk === true
    || report.healthQuality === 'ui'
    || report.healthQuality === 'bridge'
    || report.bridgeOnly === true;
  const displayOk = !!report.displayOk;
  const confirmOk = !!report.confirmOk;
  const elPresent = !!report.elPresent;
  const fetchDetail = String(report.fetchDetail || '');
  const displayDetail = String(report.displayDetail || '');
  const confirmDetail = String(report.confirmDetail || '');
  const status = String(report.status || '');

  const waitingDeps = /waiting for cross-market/i.test(fetchDetail);
  const stillLoading =
    status === 'loading'
    || /still loading|in flight|waiting for fetch|market still loading/i.test(fetchDetail);
  const notYet =
    waitingDeps
    || status === 'pending'
    || status === 'unknown'
    || status === 'missing'
    || /not evaluated|not fetched|no market payload|waiting for market|market payload not fetched/i.test(fetchDetail);

  // ── L1 data ──
  /** @type {DataState} */
  let data = DATA.UNKNOWN;
  let reason = '';

  if (stillLoading && !report.fetchOk && status !== 'ok') {
    data = DATA.WAITING;
    reason = 'loading';
  } else if (waitingDeps) {
    data = DATA.WAITING;
    reason = fetchDetail || 'waiting_deps';
  } else if (fetchOk) {
    data = DATA.READY;
    reason = fetchDetail || 'data_ready';
  } else if (notYet) {
    data = DATA.WAITING;
    reason = fetchDetail || 'waiting';
  } else if (report.error || /fetch error/i.test(fetchDetail)) {
    data = DATA.ERROR;
    reason = fetchDetail || 'error';
  } else {
    data = DATA.EMPTY;
    reason = fetchDetail || 'empty';
  }

  // Partial fill when placeholders report mid rates (optional signal)
  const ph = report.placeholders;
  let fill = null;
  if (ph && typeof ph === 'object' && ph.requiredTotal > 0) {
    fill = {
      requiredFilled: ph.requiredFilled ?? ph.filled,
      requiredTotal: ph.requiredTotal,
      rate: ph.fillRate,
    };
    if (fetchOk && ph.fillRate < 1 && ph.fillRate >= 0.85) {
      // ready but not full — keep ready; partial is below-threshold mid-band
    } else if (!fetchOk && ph.fillRate > 0 && ph.fillRate < 0.85 && !waitingDeps && !stillLoading) {
      data = DATA.PARTIAL;
      reason = fetchDetail || 'partial_fill';
    }
  }

  // Explicit flags win over inference for paint quality
  const explicitUi = report.uiOk === true || report.healthQuality === 'ui';
  const explicitBridge =
    report.bridgeOnly === true
    || report.healthQuality === 'bridge'
    || /health bridge only|health-shell|data-health-shell/i.test(displayDetail);

  // ── L2 paint (facts only; closed-tab policy is presentation) ──
  /** @type {PaintState} */
  let paint = PAINT.NA;
  /** @type {PaintVia} */
  let via = VIA.NONE;
  /** @type {ConfirmState} */
  let confirm = CONFIRM.SKIPPED;

  if (explicitUi && fetchOk) {
    paint = PAINT.TRUE_UI;
    via = VIA.NATURAL;
    confirm = confirmOk ? CONFIRM.MATCH : CONFIRM.SKIPPED;
  } else if (explicitBridge && fetchOk && (displayOk || confirmOk || status === 'ok')) {
    paint = PAINT.SHELL;
    via = VIA.BRIDGE;
    confirm = confirmOk ? CONFIRM.MATCH : CONFIRM.SKIPPED;
  } else if (
    // Legacy operational ok without bridge markers → treat as true UI facts
    status === 'ok'
    && fetchOk
    && displayOk
    && confirmOk
    && report.uiOk !== false
    && !explicitBridge
  ) {
    paint = PAINT.TRUE_UI;
    via = VIA.NATURAL;
    confirm = CONFIRM.MATCH;
  } else if (status === 'stale' && fetchOk && displayOk) {
    paint = PAINT.TRUE_UI;
    via = VIA.NATURAL;
    confirm = confirmOk ? CONFIRM.MATCH : CONFIRM.SKIPPED;
    reason = reason || 'stale';
  } else if (fetchOk && elPresent && displayOk && !confirmOk) {
    paint = PAINT.MISMATCH;
    via = VIA.NATURAL;
    confirm = CONFIRM.MISMATCH;
  } else if (fetchOk && elPresent && !displayOk) {
    const hardEmpty =
      /disabled|empty shell|empty-state|hollow body/i.test(displayDetail);
    paint = hardEmpty ? PAINT.SHELL : PAINT.PAINTING;
    via = VIA.NONE;
  } else if (fetchOk && !elPresent) {
    paint = PAINT.MISSING;
    via = VIA.NONE;
  } else if (!fetchOk) {
    paint = PAINT.NA;
    via = VIA.NONE;
  } else {
    paint = PAINT.PAINTING;
    via = VIA.NONE;
  }

  if (confirmDetail && /skipped/i.test(confirmDetail)) {
    if (confirm === CONFIRM.MATCH && via === VIA.BRIDGE) {
      // keep bridge match
    } else if (paint !== PAINT.TRUE_UI && via !== VIA.BRIDGE) {
      confirm = CONFIRM.SKIPPED;
    }
  }

  return {
    marketId: report.marketId,
    panelId: report.panelId,
    title: report.title,
    data,
    paint,
    via,
    confirm,
    reason,
    fill,
    fetchOk,
    uiOk: paint === PAINT.TRUE_UI && via === VIA.NATURAL,
    bridgeOnly: via === VIA.BRIDGE,
    source: report,
  };
}

/**
 * Attach L1/L2 fact fields onto a legacy eval report (mutates nothing; returns new object fields).
 * @param {object} report evaluatePanelHealth result
 * @returns {object} report with .health / .data / .paint layers
 */
export function attachHealthLayers(report) {
  if (!report || typeof report !== 'object') return report;
  const health = factsFromReport(report);
  return {
    ...report,
    /** @type {PanelHealthFacts} */
    health,
    /** L1 convenience */
    dataState: health.data,
    /** L2 convenience */
    paintState: health.paint,
    paintVia: health.via,
  };
}
