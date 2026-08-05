/**
 * Single presentation policy for panel health.
 *
 * Product green (verified / ui) ONLY when:
 *   data ready + paint true_ui + (tab visible for topbar)
 *
 * Bridge is always amber. Closed tab with data ready is grey pending, never green/red
 * (red only when L1 settled empty/error after load).
 */

import {
  DATA,
  PAINT,
  VIA,
  factsFromReport,
} from './types.js';

/**
 * @typedef {object} TopbarSignal
 * @property {'verified'|'bridge'|'loading'|'pending'|'failed'|'stale'} kind
 * @property {string} status legacy status string
 * @property {string} color ok|bridge|loading|pending|null|stale
 * @property {string} tooltip
 * @property {boolean} fetchOk
 * @property {boolean} displayOk
 * @property {boolean} confirmOk
 * @property {boolean} uiOk
 * @property {boolean} bridgeOnly
 * @property {object|null} report
 * @property {import('./types.js').PanelHealthFacts} health
 */

function signal(kind, rest) {
  return { kind, ...rest };
}

/**
 * Topbar / dropdown presentation (visibility-aware).
 *
 * @param {object|null|undefined} report legacy or layered report
 * @param {{ tabVisible?: boolean, marketLoading?: boolean, marketHasPayload?: boolean }} ctx
 * @returns {TopbarSignal}
 */
export function toTopbarDot(report, ctx = {}) {
  const tabVisible = !!ctx.tabVisible;
  const marketLoading = !!ctx.marketLoading;
  const marketHasPayload = ctx.marketHasPayload !== false;

  const r = report && typeof report === 'object' ? report : null;
  const health = r?.health && typeof r.health === 'object' ? r.health : factsFromReport(r);
  const fetchOk = health.fetchOk ?? health.data === DATA.READY;
  const fetchDetail = String(r?.fetchDetail || health.reason || '');
  const displayDetail = String(r?.displayDetail || '');
  const elPresent = !!r?.elPresent;
  const displayOk = !!r?.displayOk;
  const confirmOk = !!r?.confirmOk;

  const stillFetching =
    marketLoading
    || r?.status === 'loading'
    || health.data === DATA.WAITING && /loading/i.test(health.reason || '')
    || /still loading|in flight|waiting for fetch/i.test(fetchDetail);

  // ── Loading ──
  if (stillFetching && !fetchOk) {
    return signal('loading', {
      status: 'loading',
      color: 'loading',
      tooltip: 'Loading market data…',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
      uiOk: false,
      bridgeOnly: false,
      report: r,
      health,
    });
  }

  // ── Fetch not ready ──
  if (!fetchOk) {
    const waitingDeps = health.data === DATA.WAITING && /waiting|deps/i.test(health.reason || '');
    const notYet =
      waitingDeps
      || health.data === DATA.WAITING
      || health.data === DATA.UNKNOWN
      || !marketHasPayload
      || !r
      || r.status === 'pending'
      || r.status === 'unknown'
      || r.status === 'missing'
      || /not evaluated|not fetched|no market payload|waiting for market/i.test(fetchDetail);

    if (waitingDeps || (health.data === DATA.WAITING && /cross-market|waiting_deps/i.test(String(health.reason || fetchDetail)))) {
      return signal('pending', {
        status: 'pending',
        color: 'pending',
        tooltip: fetchDetail || 'Waiting for related market data…',
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        uiOk: false,
        bridgeOnly: false,
        report: r,
        health,
      });
    }

    if (notYet && !tabVisible) {
      return signal('pending', {
        status: 'pending',
        color: 'pending',
        tooltip: 'Waiting for market data…',
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        uiOk: false,
        bridgeOnly: false,
        report: r,
        health,
      });
    }

    if (notYet && tabVisible && marketHasPayload && /not evaluated/i.test(fetchDetail)) {
      return signal('pending', {
        status: 'pending',
        color: 'pending',
        tooltip: 'Evaluating panel data…',
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        uiOk: false,
        bridgeOnly: false,
        report: r,
        health,
      });
    }

    // Settled L1 failure (empty / error / partial below threshold after load)
    return signal('failed', {
      status: 'null',
      color: 'null',
      tooltip: fetchDetail
        ? `Fetch failed: ${fetchDetail}`
        : 'Fetch failed — panel data missing or hollow',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
      uiOk: false,
      bridgeOnly: false,
      report: r,
      health,
    });
  }

  // ── Fetch OK, tab not open: never red, never green ──
  if (!tabVisible) {
    return signal('pending', {
      status: 'pending',
      color: 'pending',
      tooltip: 'Data fetched — open this tab to verify display',
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
      uiOk: false,
      bridgeOnly: false,
      report: r,
      health: { ...health, paint: PAINT.NA, via: VIA.NONE, uiOk: false, bridgeOnly: false },
    });
  }

  // ── True UI green ──
  if (health.paint === PAINT.TRUE_UI && health.via === VIA.NATURAL && fetchOk && elPresent) {
    if (r?.status === 'stale' || health.reason === 'stale') {
      return signal('stale', {
        status: 'stale',
        color: 'stale',
        tooltip: 'True UI painted, but payload marked stale',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        uiOk: true,
        bridgeOnly: false,
        report: r,
        health,
      });
    }
    return signal('verified', {
      status: 'ok',
      color: 'ok',
      tooltip: 'True UI — data ready · natural paint · confirm',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      uiOk: true,
      bridgeOnly: false,
      report: r,
      health,
    });
  }

  // ── Bridge amber (never green) ──
  if (health.via === VIA.BRIDGE && fetchOk) {
    return signal('bridge', {
      status: 'pending',
      color: 'bridge',
      tooltip: 'Data ok via health bridge only — visible UI not proven',
      fetchOk: true,
      displayOk: !!displayOk,
      confirmOk: !!confirmOk,
      uiOk: false,
      bridgeOnly: true,
      report: r,
      health,
    });
  }

  // Operational ok without true_ui flags
  if (fetchOk && displayOk && confirmOk && elPresent && health.paint !== PAINT.TRUE_UI) {
    return signal('pending', {
      status: 'pending',
      color: 'pending',
      tooltip: 'Operational F/D/C claimed — waiting for true UI stamps',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      uiOk: false,
      bridgeOnly: false,
      report: r,
      health,
    });
  }

  const hardEmpty =
    elPresent
    && (
      health.paint === PAINT.SHELL && health.via !== VIA.BRIDGE
      || /disabled|empty shell|empty-state|hollow body/i.test(displayDetail)
      || (r?.status === 'null' && /empty|unavailable|disabled/i.test(displayDetail))
    );

  if (hardEmpty && !displayOk) {
    return signal('failed', {
      status: 'null',
      color: 'null',
      tooltip: `Open tab but panel empty: ${displayDetail || 'no display'}`,
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
      uiOk: false,
      bridgeOnly: false,
      report: r,
      health,
    });
  }

  // Still painting
  return signal('pending', {
    status: 'pending',
    color: 'pending',
    tooltip: !elPresent
      ? 'Tab open — panel still mounting…'
      : health.paint === PAINT.MISMATCH
        ? `Tab open — confirm mismatch (${r?.confirmDetail || '…'})`
        : !displayOk
          ? `Tab open — waiting for display (${displayDetail || 'painting'})`
          : `Tab open — confirming values (${r?.confirmDetail || '…'})`,
    fetchOk: true,
    displayOk: !!displayOk,
    confirmOk: !!confirmOk,
    uiOk: false,
    bridgeOnly: false,
    report: r,
    health,
  });
}

/**
 * Splash / flash-page chip (no tab-visibility requirement for L1 data chips).
 * Green (ui) only for true_ui facts — never bridge.
 *
 * @returns {'ui'|'bridge'|'pending'|'loading'|'stale'|'null'}
 */
export function toSplashChip(report, marketLoadStatus = null) {
  if (!report || typeof report !== 'object') {
    if (marketLoadStatus === 'loading') return 'loading';
    if (marketLoadStatus === 'error') return 'null';
    return 'pending';
  }

  const health = report.health && typeof report.health === 'object'
    ? report.health
    : factsFromReport(report);

  if (report.status === 'loading' || health.data === DATA.WAITING && health.reason === 'loading') {
    return 'loading';
  }
  if (report.status === 'stale') return 'stale';

  // True UI first
  if (health.paint === PAINT.TRUE_UI && health.via === VIA.NATURAL) return 'ui';
  if (report.uiOk === true || report.healthQuality === 'ui') return 'ui';

  // Bridge never product-green
  if (health.via === VIA.BRIDGE || report.bridgeOnly === true || report.healthQuality === 'bridge') {
    return 'bridge';
  }

  if (report.status === 'ok') {
    // status ok without ui/bridge: legacy → ui only if not explicitly uiOk false
    if (report.bridgeOnly === false && report.uiOk === false) return 'bridge';
    return 'ui';
  }

  if (health.data === DATA.READY || report.fetchOk) return 'pending';
  if (marketLoadStatus === 'loading' && health.data !== DATA.READY) return 'loading';
  if (
    health.data === DATA.WAITING
    || report.status === 'pending'
    || report.status === 'missing'
    || report.status === 'unknown'
  ) {
    return 'pending';
  }
  return 'null';
}

/**
 * Aggregate market flash-page border from panel chips (not payload-only load).
 * @returns {'pending'|'loading'|'ok'|'bridge'|'partial'|'error'}
 */
export function toMarketSplashKind({ marketLoadStatus, reports, panelIds } = {}) {
  const load = marketLoadStatus || 'pending';
  if (load === 'loading' || load === 'pending') return load;

  const ids = Array.isArray(panelIds) && panelIds.length
    ? panelIds
    : Object.keys(reports || {});
  if (!ids.length) {
    if (load === 'error') return 'error';
    if (load === 'ok') return 'partial';
    return load;
  }

  let ui = 0;
  let bridge = 0;
  let bad = 0;
  let loading = 0;
  for (const id of ids) {
    const kind = toSplashChip(reports?.[id], load);
    if (kind === 'ui') ui++;
    else if (kind === 'bridge') bridge++;
    else if (kind === 'loading') loading++;
    else bad++;
  }

  const total = ids.length;
  if (loading > 0 && ui + bridge === 0) return 'loading';
  if (ui === total) return 'ok';
  if (ui + bridge === total && bridge > 0) return 'bridge';
  if (ui + bridge > 0) return 'partial';
  if (load === 'error') return 'error';
  return 'partial';
}

/** Per-market tallies for splash headers. */
export function toMarketTallies(reports, panelIds) {
  const ids = Array.isArray(panelIds) && panelIds.length
    ? panelIds
    : Object.keys(reports || {});
  let ui = 0;
  let bridge = 0;
  let bad = 0;
  let loading = 0;
  let dataReady = 0;
  for (const id of ids) {
    const r = reports?.[id];
    const kind = toSplashChip(r);
    if (kind === 'ui') ui++;
    else if (kind === 'bridge') bridge++;
    else if (kind === 'loading') loading++;
    else bad++;
    const health = r?.health || (r ? factsFromReport(r) : null);
    if (health?.data === DATA.READY || r?.fetchOk) dataReady++;
  }
  return {
    total: ids.length,
    ui,
    bridge,
    bad,
    loading,
    dataReady,
    /** Operational ok = ui + bridge (legacy progress numerator). */
    operationalOk: ui + bridge,
  };
}

/**
 * Global splash counters. okUi = true UI only; okBridge separate; bad = incomplete.
 */
export function countHealthStatuses(reportsByMarket) {
  let ok = 0;
  let okUi = 0;
  let okBridge = 0;
  let bad = 0;
  let loading = 0;
  let pending = 0;
  let fetchFail = 0;
  let confirmFail = 0;
  let dataReady = 0;
  let total = 0;

  for (const reports of Object.values(reportsByMarket || {})) {
    for (const r of Object.values(reports || {})) {
      total++;
      const health = r?.health && typeof r.health === 'object' ? r.health : factsFromReport(r);
      if (health.data === DATA.READY || r?.fetchOk) dataReady++;

      if (r.status === 'ok') {
        ok++;
        if (health.paint === PAINT.TRUE_UI || r.uiOk || r.healthQuality === 'ui') okUi++;
        else if (health.via === VIA.BRIDGE || r.bridgeOnly || r.healthQuality === 'bridge') okBridge++;
        else okUi++; // legacy unflagged ok → treat as UI
      } else if (r.status === 'loading') {
        loading++;
      } else {
        bad++;
        if (!r.fetchOk && health.data !== DATA.READY) fetchFail++;
        else if (!r.displayOk) pending++;
        else if (!r.confirmOk) {
          confirmFail++;
          pending++;
        } else {
          pending++;
        }
      }
    }
  }
  return {
    ok,
    okUi,
    okBridge,
    bad,
    loading,
    total,
    pending,
    fetchFail,
    confirmFail,
    dataReady,
  };
}

/** Map topbar color → splash chip kind (shared vocabulary). */
export function topbarColorToSplash(color) {
  if (color === 'ok') return 'ui';
  if (color === 'bridge') return 'bridge';
  if (color === 'loading') return 'loading';
  if (color === 'stale') return 'stale';
  if (color === 'pending') return 'pending';
  return 'null';
}
