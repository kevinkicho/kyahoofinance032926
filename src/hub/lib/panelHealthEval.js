/**
 * Panel health evaluation — layered L1 (data) + L2 (paint).
 *
 * L1 (health/panelData.js): placeholders / field map / contract — no DOM
 * L2 (health/panelPaint.js): display + confirm; bridge tagged, never product green
 *
 * Operational status `ok` when F/D/C pass (bridge may complete D/C for operators).
 * Product green requires uiOk / paint true_ui via health/present.js.
 */

import { MARKET_PANELS } from '../../data/marketPanels';
import { getBusPanel } from './panelHealthBus.js';
import {
  resolvePath as resolvePathUtil,
  hasSubstance as hasSubstanceUtil,
  placeholderValueOk,
} from './panelHealthUtils.js';
import { findScopedPanelEl } from './panelHealthSignal.js';
import { attachHealthLayers } from './health/types.js';
import {
  evaluatePanelData,
  evaluateAllMarketsDataOnly,
  reportFromPanelData,
  getPanelSpec,
  getRegistryEntry,
  resolvePanelFieldValue,
  collectSamples,
} from './health/panelData.js';
import { evaluatePanelPaint } from './health/panelPaint.js';
import {
  toSplashChip,
  toMarketSplashKind,
  toMarketTallies,
  countHealthStatuses,
} from './health/present.js';
import { readOperatorMode } from './operatorMode.js';

export const resolvePath = resolvePathUtil;
export const hasSubstance = hasSubstanceUtil;
export { placeholderValueOk };
export { getPanelSpec, getRegistryEntry, resolvePanelFieldValue, collectSamples };
export {
  evaluatePanelData,
  evaluateAllMarketsDataOnly,
  reportFromPanelData,
} from './health/panelData.js';
export { evaluatePanelPaint } from './health/panelPaint.js';

function textHasSample(text, sample) {
  if (sample == null || !text) return false;
  if (typeof sample === 'string') return text.includes(sample);
  if (typeof sample === 'number' && Number.isFinite(sample)) {
    const candidates = new Set([
      String(sample),
      sample.toFixed(0),
      sample.toFixed(1),
      sample.toFixed(2),
      sample.toFixed(3),
    ]);
    const abs = Math.abs(sample);
    if (abs >= 1000) {
      candidates.add((sample / 1e3).toFixed(1));
      candidates.add((sample / 1e3).toFixed(2));
      candidates.add((sample / 1e6).toFixed(1));
      candidates.add((sample / 1e6).toFixed(2));
      candidates.add((sample / 1e9).toFixed(1));
      candidates.add((sample / 1e9).toFixed(2));
    }
    // Do NOT invent bps-style alternates (0.78 → 78) — that false-matched years,
    // layout numbers, and unrelated metrics across panels.
    for (const c of [...candidates]) {
      if (!c) continue;
      // Only strip trailing zeros from decimals, keep integer forms as-is
      if (c.includes('.')) {
        candidates.add(c.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'));
      }
    }
    for (const c of candidates) {
      // Ignore trivial single-digit matches (too common in chrome / counts)
      if (c && c.length >= 2 && text.includes(c)) return true;
      if (c && c.length === 1 && abs < 10 && abs === Math.floor(abs)) {
        // allow single digit only when sample is that exact integer and appears as standalone
        if (new RegExp(`(?<![\\d.])${c}(?![\\d.])`).test(text)) return true;
      }
    }
  }
  return false;
}

function getPanelDisplayText(el) {
  if (!el) return '';
  let text = el.textContent || '';
  el.querySelectorAll('text, tspan, title, [aria-label]').forEach(n => {
    text += ` ${n.textContent || ''} ${n.getAttribute?.('aria-label') || ''}`;
  });
  // MetricValue stamps raw + formatted values for confirm without relying on layout
  el.querySelectorAll('[data-metric-value], [data-metric-display]').forEach(n => {
    text += ` ${n.getAttribute('data-metric-value') || ''} ${n.getAttribute('data-metric-display') || ''}`;
  });
  return text.replace(/\s+/g, ' ');
}

/** Series samples stamped by SafeECharts on [data-series-samples]. */
function getChartSeriesSamples(el) {
  if (!el) return [];
  const samples = [];
  const nodes = [el, ...el.querySelectorAll('[data-series-samples]')];
  for (const node of nodes) {
    const raw = node.getAttribute?.('data-series-samples');
    if (!raw) continue;
    for (const part of raw.split(',')) {
      const n = Number(part);
      if (Number.isFinite(n)) samples.push(n);
    }
  }
  // Fallback: global echarts if present
  if (samples.length === 0 && typeof window !== 'undefined' && window.echarts?.getInstanceByDom) {
    const candidates = el.querySelectorAll('div, canvas');
    const seen = new Set();
    for (const node of candidates) {
      const host = node.tagName === 'CANVAS' ? node.parentElement : node;
      if (!host || seen.has(host)) continue;
      seen.add(host);
      try {
        const inst = window.echarts.getInstanceByDom(host);
        const opt = inst?.getOption?.();
        for (const s of opt?.series || []) {
          for (const pt of (s.data || []).slice(-8)) {
            if (typeof pt === 'number') samples.push(pt);
            else if (Array.isArray(pt) && typeof pt[pt.length - 1] === 'number') samples.push(pt[pt.length - 1]);
          }
        }
      } catch { /* ignore */ }
    }
  }
  return samples;
}

function samplesMatch(fetchSamples, displaySamples) {
  let hits = 0;
  for (const s of fetchSamples) {
    if (typeof s !== 'number') continue;
    const ok = displaySamples.some(cs => {
      if (typeof cs !== 'number') return false;
      if (cs === s) return true;
      return Math.abs(cs - s) < Math.max(1e-6, Math.abs(s) * 1e-3);
    });
    if (ok) hits++;
  }
  return hits;
}

export function confirmDisplayMatchesFetch(el, fieldValue) {
  if (!el || fieldValue == null) {
    return { ok: false, detail: 'no element or no field value', matched: 0, samples: 0 };
  }
  if (!hasSubstance(fieldValue)) {
    return { ok: false, detail: 'fetched field is empty/null — cannot confirm', matched: 0, samples: 0 };
  }
  const samples = collectSamples(fieldValue).filter((s) => {
    if (typeof s === 'number') return Number.isFinite(s);
    // Only keep distinctive strings (names) — skip short tokens
    return typeof s === 'string' && s.length >= 4;
  });
  if (samples.length === 0) {
    return { ok: false, detail: 'no leaf samples to confirm', matched: 0, samples: 0 };
  }

  const content = el.querySelector?.('.bento-panel-content') || el;
  const text = getPanelDisplayText(content);
  // "All Clear" / zero-anomaly is a valid healthy state for alert panels
  if (/\ball clear\b/i.test(text) && content.querySelector?.('[data-metric-value], table, [data-series-samples]')) {
    return { ok: true, detail: 'all-clear status with metrics', matched: 1, samples: samples.length, via: 'all-clear' };
  }
  if (/\bno data\b|\bunavailable\b|\bnot available\b|\bwaiting for\b/i.test(text) && text.length < 320) {
    return { ok: false, detail: 'panel shows empty-state text', matched: 0, samples: samples.length };
  }

  // Prefer stamped metric values (authoritative) over free-text scanning
  const stampNums = [...content.querySelectorAll?.('[data-metric-value]') || []]
    .map((n) => Number(n.getAttribute('data-metric-value')))
    .filter((n) => Number.isFinite(n));
  const stampHits = samplesMatch(samples, stampNums);

  const chartSamples = getChartSeriesSamples(content);
  const chartHits = samplesMatch(samples, chartSamples);

  let textMatched = 0;
  const hits = [];
  for (const s of samples) {
    if (typeof s === 'number' && stampNums.some((t) => Math.abs(t - s) < Math.max(1e-6, Math.abs(s) * 1e-3))) {
      textMatched++;
      hits.push(s);
      continue;
    }
    if (textHasSample(text, s)) {
      textMatched++;
      hits.push(s);
      if (textMatched >= 4) break;
    }
  }

  // Authoritative paths first
  if (stampHits >= 1) {
    return {
      ok: true,
      detail: `confirmed ${stampHits} sample(s) via metric stamps`,
      matched: stampHits,
      samples: samples.length,
      hits: samples.filter((s) => typeof s === 'number').slice(0, 4),
      via: 'data-metric-value',
    };
  }
  if (chartHits >= 1) {
    return {
      ok: true,
      detail: `confirmed ${chartHits} sample(s) via chart series binding`,
      matched: chartHits,
      samples: samples.length,
      hits: samples.filter((s) => typeof s === 'number').slice(0, 4),
      via: 'data-series-samples',
    };
  }

  // Text-only confirm is last resort and requires stronger evidence + non-hollow body
  const hollowMarks = (text.match(/—|–|\bN\/A\b/g) || []).length;
  const numericSamples = samples.filter((s) => typeof s === 'number');
  const need = numericSamples.length <= 1 ? 1 : 2;
  const textOk = textMatched >= need && hollowMarks < 3;
  return {
    ok: textOk,
    detail: textOk
      ? `confirmed ${textMatched}/${samples.length} sample(s) in DOM text`
      : `only ${textMatched}/${samples.length} sample(s) matched (need ${need}; stamps=${stampHits} chart=${chartHits})`,
    matched: textMatched,
    samples: samples.length,
    hits: hits.slice(0, 4),
  };
}

export function classifyPanelDisplay(el, { fetchOk = false } = {}) {
  if (!el) return { ok: false, detail: 'panel not in DOM', kind: 'missing' };

  // Disabled shells stay mounted for layout/signalling but are not "display ok".
  if (
    el.getAttribute?.('data-panel-disabled') === '1' ||
    el.classList?.contains?.('bento-card--disabled') ||
    el.querySelector?.('[data-panel-disabled="1"], .bento-card--disabled, [data-panel-empty="1"]')
  ) {
    return { ok: false, detail: 'panel disabled / empty shell', kind: 'null' };
  }

  const footer = el.querySelector('.bento-footer, [class*="footer"], .data-footer');
  const footerText = footer?.textContent || '';

  if (/stale/i.test(footerText) && !fetchOk) {
    return { ok: false, detail: 'footer reports stale', kind: 'stale' };
  }

  // Score the content body only — ignore title row / chrome.
  const content = el.querySelector('.bento-panel-content') || el;
  const body = (content.textContent || '').replace(/\s+/g, ' ').trim();
  if (/\bno data\b|\bunavailable\b|\bnot available\b|\bno .* scheduled\b|\bwaiting for\b|\bload .* for\b|\bempty\b/i.test(body)
    && body.length < 320) {
    return { ok: false, detail: 'empty-state message in panel', kind: 'null' };
  }

  const hollowMarks = (body.match(/—|–|\bN\/A\b|\bn\/a\b/g) || []).length;
  const metricValues = [...content.querySelectorAll('[data-metric-value]')]
    .map((n) => n.getAttribute('data-metric-value'))
    .filter((v) => {
      if (v == null || v === '' || v === '—' || v === 'null' || v === 'undefined') return false;
      const n = Number(v);
      return Number.isFinite(n);
    });

  const chartSamples = getChartSeriesSamples(content).filter((n) => Number.isFinite(n) && n !== 0);
  // Require variance so a flat zero series does not count
  const chartUnique = new Set(chartSamples.map((n) => Math.round(n * 1000) / 1000));

  // Table cells with real multi-digit numbers (not years / em dashes)
  const cells = [...content.querySelectorAll('td, th, [class*="kpi"], [class*="value"], [class*="metric"]')];
  let cellHits = 0;
  for (const cell of cells) {
    const t = (cell.textContent || '').trim();
    if (!t || t === '—' || t === '-' || t === 'N/A') continue;
    const m = t.match(/-?\d+(?:\.\d+)?/);
    if (!m) continue;
    const n = Number(m[0]);
    if (!Number.isFinite(n)) continue;
    if (m[0].length === 4 && n >= 1990 && n <= 2100) continue;
    if (m[0].length < 2 && Math.abs(n) < 10) continue;
    cellHits++;
  }

  if (hollowMarks >= 4 && metricValues.length === 0 && chartSamples.length < 2 && cellHits < 3) {
    return { ok: false, detail: 'hollow body (mostly empty placeholders)', kind: 'null' };
  }

  // ── Authoritative display signals only ──
  // Raw text digits / canvas without samples are NOT enough (main false-green source).
  if (metricValues.length >= 1) {
    return { ok: true, detail: `metric stamps (${metricValues.length})`, kind: 'ok' };
  }
  // Charts: accept 2+ finite non-zero samples with variance (was 3 — left many
  // real single-series / short-history charts on the bridge-only path).
  if (chartSamples.length >= 2 && chartUnique.size >= 2) {
    return { ok: true, detail: `chart series bound (${chartSamples.length} pts, ${chartUnique.size} unique)`, kind: 'ok' };
  }
  // Dense tables / KPI grids
  if (cellHits >= 3 && hollowMarks < cellHits) {
    return { ok: true, detail: `table/kpi cells with values (${cellHits})`, kind: 'ok' };
  }

  return { ok: false, detail: 'no stamped metrics / chart series / dense table values', kind: 'null' };
}

function findPanelEl(marketId, panelId) {
  return findScopedPanelEl(marketId, panelId);
}

/**
 * @param {object} args
 * @param {boolean} [args.createShell] health-bridge shells for unmounted panels.
 *   Default: operator/verify mode only (`readOperatorMode()`). Consumer never
 *   invents hidden shells (progressive + open-tab paint must be natural).
 * @param {boolean} [args.dataOnly] L1 only — skip DOM/paint entirely.
 */
export function evaluatePanelHealth({
  marketId,
  panelId,
  panelTitle,
  marketCtx,
  allMarkets,
  createShell,
  dataOnly = false,
}) {
  const bus = getBusPanel(marketId, panelId);
  let el = findPanelEl(marketId, panelId);
  const allowShell = createShell !== undefined ? !!createShell : readOperatorMode();

  // ── L1: pure data (no DOM) ──
  const l1 = evaluatePanelData({ marketId, panelId, marketCtx, allMarkets });
  const spec = l1.spec || getPanelSpec(marketId, panelId);
  const title = panelTitle || spec?.title || panelId;

  if (dataOnly) {
    return reportFromPanelData(l1, { marketId, panelId, title, marketCtx });
  }

  if (marketCtx?.isLoading && !bus?.fetchOk && !l1.fetchOk) {
    return attachHealthLayers({
      status: 'loading',
      marketId,
      panelId,
      title,
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
      fetchDetail: 'market still loading',
      displayDetail: el ? 'DOM present while loading' : 'panel not in DOM yet',
      confirmDetail: 'waiting for fetch',
      field: spec?.field || null,
      fieldPath: spec?.fieldPath || null,
      elPresent: !!el,
      dataSource: l1.source,
      contract: l1.contract,
    });
  }

  const fetchOk = l1.fetchOk;
  const fetchDetail = l1.fetchDetail;
  const fieldValue = l1.fieldValue;
  const placeholderStats = l1.placeholders;
  const stampSource = fieldValue != null ? fieldValue : (fetchOk ? marketCtx?.data : null);

  // ── L2: paint (DOM; bridge shells only in operator/verify) ──
  const l2 = evaluatePanelPaint({
    marketId,
    panelId,
    el,
    fetchOk,
    fieldValue,
    stampSource,
    createShell: allowShell,
    classifyPanelDisplay,
    confirmDisplayMatchesFetch,
  });
  el = l2.el;

  const waitingCross = /waiting for cross-market/i.test(fetchDetail);
  let status = 'null';
  if (fetchOk && l2.displayOk && l2.confirmOk) status = 'ok';
  else if (l2.display?.kind === 'stale' && fetchOk) status = 'stale';
  else if (marketCtx?.isLoading && !fetchOk) status = 'loading';
  else if (waitingCross) status = 'pending';
  else if (fetchOk && l2.display?.kind === 'missing') status = 'pending';
  else if (fetchOk && !l2.displayOk) status = 'pending';
  else if (!fetchOk && !marketCtx?.data) status = 'pending';
  else if (l2.display?.kind === 'missing') status = 'missing';

  const healthQuality = status === 'ok' ? l2.healthQuality : null;

  const report = {
    status,
    marketId,
    panelId,
    title,
    fetchOk,
    displayOk: l2.displayOk,
    confirmOk: l2.confirmOk,
    /** Real panel paint (not health-shell / bridge-only stamps). */
    uiOk: l2.uiOk,
    /** D/C satisfied only because of health bridge stamps. */
    bridgeOnly: !!(status === 'ok' && l2.bridgeOnly),
    healthQuality,
    fetchDetail,
    displayDetail: l2.displayDetail,
    confirmDetail: l2.confirmDetail,
    waitingCrossMarket: waitingCross,
    field: spec?.field || null,
    fieldPath: spec?.fieldPath || null,
    source: spec?.source || null,
    external: spec?.external || null,
    elPresent: l2.elPresent,
    fetchedOn: marketCtx?.fetchedOn || marketCtx?.data?.fetchedOn || null,
    isLive: !!marketCtx?.isLive,
    isCurrent: marketCtx?.isCurrent,
    confirmMeta: l2.confirmMeta,
    specFrom: spec?._from || null,
    placeholders: placeholderStats,
    /** L1 source: placeholders | spec | contract | none */
    dataSource: l1.source,
    /** Contract panel requiredFields check (annotation) */
    contract: l1.contract,
    /** L1 samples for offline confirm tooling */
    dataSamples: l1.samples,
  };

  return attachHealthLayers(report);
}

/**
 * @param {string} marketId
 * @param {object} marketCtx
 * @param {object} allMarkets
 * @param {{ createShell?: boolean, dataOnly?: boolean }} [opts]
 */
export function evaluateMarketPanels(marketId, marketCtx, allMarkets, opts = {}) {
  const panels = MARKET_PANELS[marketId] || [];
  const out = {};
  for (const p of panels) {
    out[p.id] = evaluatePanelHealth({
      marketId,
      panelId: p.id,
      panelTitle: p.title,
      marketCtx,
      allMarkets,
      createShell: opts.createShell,
      dataOnly: opts.dataOnly,
    });
  }
  return out;
}

export function statusMapFromReports(reports) {
  const out = {};
  for (const [id, r] of Object.entries(reports || {})) {
    out[id] = r?.status || 'null';
  }
  return out;
}

/**
 * @param {function|object} getMarket
 * @param {object} allMarkets
 * @param {{ createShell?: boolean, dataOnly?: boolean }} [opts]
 *   dataOnly: L1 progressive path (no DOM / no shells)
 *   createShell: default operator mode when omitted
 */
export function evaluateAllMarkets(getMarket, allMarkets, opts = {}) {
  if (opts.dataOnly) {
    return evaluateAllMarketsDataOnly(getMarket, allMarkets, MARKET_PANELS);
  }
  const cache = {};
  const markets = allMarkets || {};
  for (const marketId of Object.keys(MARKET_PANELS)) {
    const marketCtx = typeof getMarket === 'function' ? getMarket(marketId) : markets?.[marketId];
    cache[marketId] = evaluateMarketPanels(marketId, marketCtx, markets, opts);
  }
  return cache;
}

/**
 * Splash counters — delegated to health/present (single policy).
 * Adds dataReady (L1) alongside okUi / okBridge (L2 honesty).
 */
export function countStatuses(reportsByMarket) {
  return countHealthStatuses(reportsByMarket);
}

/**
 * Splash / flash-page presentation helpers.
 *
 * Product green = true UI only. Bridge is amber. See hub/lib/health/present.js.
 *
 * Chip kinds (CSS suffix):
 *   ui      — real paint (uiOk / healthQuality ui / paint true_ui)
 *   bridge  — F/D/C only via health bridge
 *   pending — fetch ready or not yet evaluated; UI not confirmed
 *   loading — in flight
 *   stale   — stale payload with usable display
 *   null    — fetch failed / hollow after load
 */

/** @returns {'ui'|'bridge'|'pending'|'loading'|'stale'|'null'} */
export function panelChipKind(report, marketLoadStatus = null) {
  return toSplashChip(report, marketLoadStatus);
}

/**
 * Aggregate market flash-page border/icon from *panel* reports, not from
 * "ctx.data is non-null" (hollow 200 payloads used to force full green).
 *
 * @returns {'pending'|'loading'|'ok'|'bridge'|'partial'|'error'}
 */
export function marketSplashKind(args) {
  return toMarketSplashKind(args);
}

/** Per-market panel tallies for splash headers. */
export function marketPanelTallies(reports, panelIds) {
  return toMarketTallies(reports, panelIds);
}
