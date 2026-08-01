/**
 * Panel health signal state machine (topbar dropdown dots).
 *
 * This is intentionally separate from DataProvider fetch policy:
 *   - Health re-eval does NOT re-fetch APIs.
 *   - Dot color must not imply "data went bad" when the tab simply is not open.
 *
 * Color contract:
 *   green  (verified)       — active visible tab + fetch + display + confirm
 *   amber  (loading)        — market/panel still loading
 *   grey   (pending)        — fetch ready but tab closed OR still painting
 *   red    (failed)         — fetch failed after load, OR open tab settled empty
 *   blue   (stale)          — serving stale payload with usable display
 */

/**
 * @typedef {object} HealthReport
 * @property {string} [status]
 * @property {boolean} [fetchOk]
 * @property {boolean} [displayOk]
 * @property {boolean} [confirmOk]
 * @property {boolean} [elPresent]
 * @property {string} [fetchDetail]
 * @property {string} [displayDetail]
 * @property {string} [confirmDetail]
 * @property {boolean} [isLive]
 * @property {boolean} [isCurrent]
 */

/**
 * @typedef {object} PanelSignal
 * @property {'verified'|'loading'|'pending'|'failed'|'stale'} kind
 * @property {string} status   — legacy status string for callers
 * @property {string} color    — ok|loading|pending|null|stale
 * @property {string} tooltip
 * @property {boolean} fetchOk
 * @property {boolean} displayOk
 * @property {boolean} confirmOk
 * @property {HealthReport} report
 */

/**
 * Pure signal derivation — unit-test this, not the React hook.
 *
 * @param {HealthReport|null|undefined} report
 * @param {{ tabVisible: boolean, marketLoading?: boolean, marketHasPayload?: boolean }} ctx
 * @returns {PanelSignal}
 */
export function derivePanelSignal(report, ctx = {}) {
  const tabVisible = !!ctx.tabVisible;
  const marketLoading = !!ctx.marketLoading;
  const marketHasPayload = ctx.marketHasPayload !== false; // default true if unknown

  const r = report && typeof report === 'object' ? report : null;
  const fetchOk = !!r?.fetchOk;
  const displayOk = !!r?.displayOk;
  const confirmOk = !!r?.confirmOk;
  const elPresent = !!r?.elPresent;
  const fetchDetail = String(r?.fetchDetail || '');
  const displayDetail = String(r?.displayDetail || '');

  const stillFetching =
    marketLoading
    || r?.status === 'loading'
    || /still loading|in flight|waiting for fetch/i.test(fetchDetail);

  // ── Loading ──
  if (stillFetching && !fetchOk) {
    return signal('loading', {
      status: 'loading',
      color: 'loading',
      tooltip: 'Loading market data…',
      fetchOk,
      displayOk: false,
      confirmOk: false,
      report: r,
    });
  }

  // ── Fetch failed (after load attempt) ──
  // Only red when we know fetch failed — not "not evaluated yet" or satellite lag.
  if (!fetchOk) {
    const waitingDeps = /waiting for cross-market/i.test(fetchDetail);
    const notYet =
      waitingDeps
      || !marketHasPayload
      || !r
      || r.status === 'pending'
      || r.status === 'unknown'
      || r.status === 'missing'
      || /not evaluated|not fetched|no market payload|waiting for market/i.test(fetchDetail);

    if (waitingDeps) {
      return signal('pending', {
        status: 'pending',
        color: 'pending',
        tooltip: fetchDetail || 'Waiting for related market data…',
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        report: r,
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
        report: r,
      });
    }

    // Open tab, primary loaded, but placeholders incomplete → failed
    // Closed tab with known hollow primary → failed
    if (notYet && tabVisible && !waitingDeps && marketHasPayload) {
      // still painting primary payload into placeholders
      if (/not evaluated/i.test(fetchDetail)) {
        return signal('pending', {
          status: 'pending',
          color: 'pending',
          tooltip: 'Evaluating panel data…',
          fetchOk: false,
          displayOk: false,
          confirmOk: false,
          report: r,
        });
      }
    }

    return signal('failed', {
      status: 'null',
      color: 'null',
      tooltip: fetchDetail
        ? `Fetch failed: ${fetchDetail}`
        : 'Fetch failed — panel data missing or hollow',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
      report: r,
    });
  }

  // ── Fetch OK, tab not open: never red ──
  if (!tabVisible) {
    return signal('pending', {
      status: 'pending',
      color: 'pending',
      tooltip: 'Data fetched — open this tab to verify display',
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
      report: r,
    });
  }

  // ── Fetch OK, tab open: full gates ──
  if (displayOk && confirmOk && elPresent) {
    if (r?.status === 'stale' || (r?.isCurrent === false && r?.isLive === false)) {
      return signal('stale', {
        status: 'stale',
        color: 'stale',
        tooltip: 'Displayed, but payload marked stale',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        report: r,
      });
    }
    return signal('verified', {
      status: 'ok',
      color: 'ok',
      tooltip: 'Fetch · display · confirm all passed',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      report: r,
    });
  }

  // Explicit empty / disabled shell on the open tab → real failure
  const hardEmpty =
    elPresent
    && (
      /disabled|empty shell|empty-state|hollow body/i.test(displayDetail)
      || r?.status === 'null' && /empty|unavailable|disabled/i.test(displayDetail)
    );

  if (hardEmpty && !displayOk) {
    return signal('failed', {
      status: 'null',
      color: 'null',
      tooltip: `Open tab but panel empty: ${displayDetail || 'no display'}`,
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
      report: r,
    });
  }

  // Still painting / confirm catching up → pending (NOT red)
  return signal('pending', {
    status: 'pending',
    color: 'pending',
    tooltip: !elPresent
      ? 'Tab open — panel still mounting…'
      : !displayOk
        ? `Tab open — waiting for display (${displayDetail || 'painting'})`
        : `Tab open — confirming values (${r?.confirmDetail || '…'})`,
    fetchOk: true,
    displayOk: !!displayOk,
    confirmOk: !!confirmOk,
    report: r,
  });
}

function signal(kind, rest) {
  return { kind, ...rest };
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
