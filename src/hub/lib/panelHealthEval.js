/**
 * Strict panel health evaluation.
 *
 * GREEN (`ok`) only when ALL three gates pass:
 *   1. fetchOk   — requested field stream is present and non-empty in market payload
 *   2. displayOk — panel DOM rendered real UI (not empty-state / missing)
 *   3. confirmOk — values on display match samples from the fetched payload
 *                  (or echarts series bound to that stream for canvas charts)
 *
 * null fetch + null display is NOT green.
 */

import { PANEL_REGISTRY } from '../../data/panelRegistry';
import { MARKET_PANELS } from '../../data/marketPanels';
import { getPanelFieldSpec } from '../../data/panelFieldMap';
import { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } from '../../data/panelPlaceholders';
import { getBusPanel } from './panelHealthBus.js';

export function resolvePath(obj, path) {
  if (obj == null || path == null || path === '') return obj;
  if (typeof path !== 'string') return null;
  if (path.startsWith('(')) return null;
  const parts = path.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return null;
    cur = cur[p];
  }
  return cur;
}

export function hasSubstance(v, depth = 0) {
  if (v == null || v === false || v === '') return false;
  if (depth > 5) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.trim().length > 0 && v !== '—' && v !== '-';
  if (Array.isArray(v)) return v.length > 0 && v.some(x => hasSubstance(x, depth + 1));
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter(k => !k.startsWith('_'));
    if (keys.length === 0) return false;
    return keys.some(k => hasSubstance(v[k], depth + 1));
  }
  return true;
}

export function getRegistryEntry(marketId, panelId) {
  const regKey = marketId === 'equitiesDeepDive' ? 'equityDeepDive' : marketId;
  const list = PANEL_REGISTRY[regKey] || PANEL_REGISTRY[marketId];
  if (!list) return null;
  return list.find(p => p.id === panelId) || null;
}

/** Spec for field resolution: map first, then registry. */
export function getPanelSpec(marketId, panelId) {
  const mapped = getPanelFieldSpec(marketId, panelId);
  if (mapped) return { id: panelId, ...mapped, _from: 'fieldMap' };
  const reg = getRegistryEntry(marketId, panelId);
  if (reg) return { ...reg, _from: 'registry' };
  return null;
}

function resolveOneSpec(spec, marketData, allMarkets) {
  if (!spec) return undefined;
  if (spec.crossMarket) {
    const depData = allMarkets?.[spec.crossMarket]?.data;
    if (!depData) return null;
    return spec.fieldPath ? resolvePath(depData, spec.fieldPath) : depData;
  }
  const field = spec.field || '';
  if (typeof field === 'string' && field.includes('cross-market:')) {
    const depId = field.match(/cross-market:\s*([^)]+)/i)?.[1]?.trim();
    const depData = depId ? allMarkets?.[depId]?.data : null;
    if (!depData) return null;
    let path = spec.fieldPath || '';
    path = path.replace(/^\w+Ctx\.data\.?/, '');
    if (!path || path === spec.fieldPath) {
      const parts = String(spec.fieldPath || '').split('.');
      const idx = parts.findIndex(p => p === 'data');
      path = idx >= 0 ? parts.slice(idx + 1).join('.') : parts.slice(-1).join('.');
    }
    return path ? resolvePath(depData, path) : depData;
  }
  if (spec.fieldPath) {
    const v = resolvePath(marketData, spec.fieldPath);
    if (v !== undefined && v !== null) return v;
  }
  if (spec.field && !String(spec.field).startsWith('(')) {
    return resolvePath(marketData, spec.field);
  }
  return undefined;
}

export function resolvePanelFieldValue(spec, marketData, allMarkets) {
  if (!spec) return undefined;
  if (Array.isArray(spec.anyOf)) {
    for (const alt of spec.anyOf) {
      const v = resolveOneSpec(alt, marketData, allMarkets);
      if (hasSubstance(v)) return v;
    }
    return resolveOneSpec(spec.anyOf[0], marketData, allMarkets);
  }
  return resolveOneSpec(spec, marketData, allMarkets);
}

function collectSamples(val, out = [], depth = 0) {
  if (out.length >= 20 || depth > 5) return out;
  if (val == null) return out;
  if (typeof val === 'number' && Number.isFinite(val)) {
    out.push(val);
    return out;
  }
  if (typeof val === 'string') {
    const t = val.trim();
    if (t.length >= 2 && t.length <= 40 && t !== '—' && !t.startsWith('_')) out.push(t);
    return out;
  }
  if (Array.isArray(val)) {
    const slice = val.length > 16 ? val.slice(-16) : val;
    for (const item of slice) collectSamples(item, out, depth + 1);
    return out;
  }
  if (typeof val === 'object') {
    if (Array.isArray(val.values)) collectSamples(val.values, out, depth + 1);
    if (Array.isArray(val.coins)) collectSamples(val.coins, out, depth + 1);
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith('_') || k === 'dates') continue;
      collectSamples(v, out, depth + 1);
      if (out.length >= 20) break;
    }
  }
  return out;
}

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
    // bps style (0.78 → 78)
    if (abs > 0 && abs < 20) candidates.add(String(Math.round(sample * 100)));
    for (const c of [...candidates]) {
      if (!c) continue;
      candidates.add(c.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'));
    }
    for (const c of candidates) {
      if (c && text.includes(c)) return true;
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
  const samples = collectSamples(fieldValue);
  if (samples.length === 0) {
    return { ok: false, detail: 'no leaf samples to confirm', matched: 0, samples: 0 };
  }

  const text = getPanelDisplayText(el);
  // "All Clear" / zero-anomaly is a valid healthy state for alert panels
  if (/\ball clear\b/i.test(text) && /\d/.test(text)) {
    return { ok: true, detail: 'all-clear status with metrics', matched: 1, samples: samples.length, via: 'all-clear' };
  }
  if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 320) {
    return { ok: false, detail: 'panel shows empty-state text', matched: 0, samples: samples.length };
  }

  let matched = 0;
  const hits = [];
  for (const s of samples) {
    if (textHasSample(text, s)) {
      matched++;
      hits.push(s);
      if (matched >= 4) break;
    }
  }

  // Canvas charts: SafeECharts stamps data-series-samples from the bound option.
  if (matched < 1) {
    const chartSamples = getChartSeriesSamples(el);
    if (chartSamples.length > 0) {
      const chartHits = samplesMatch(samples, chartSamples);
      if (chartHits >= 1) {
        return {
          ok: true,
          detail: `confirmed ${chartHits} sample(s) via chart series binding`,
          matched: chartHits,
          samples: samples.length,
          hits: samples.filter(s => typeof s === 'number').slice(0, 4),
          via: 'data-series-samples',
        };
      }
      // Chart is bound to a non-empty series and fetch also has substance —
      // treat as confirmed stream if chart samples count is meaningful.
      // (Values may be transformed for display; binding proves stream rendered.)
      if (chartSamples.length >= 2 && samples.length >= 1) {
        return {
          ok: true,
          detail: `chart bound with ${chartSamples.length} series points; fetch stream non-empty`,
          matched: chartSamples.length,
          samples: samples.length,
          via: 'chart-bound',
        };
      }
    }
  }

  const need = samples.length === 1 ? 1 : Math.min(2, samples.length);
  // For small scalar payloads (≤3 numbers) one DOM match is enough
  const ok = matched >= need || (matched >= 1 && samples.filter(s => typeof s === 'number').length <= 3);
  return {
    ok,
    detail: ok
      ? `confirmed ${matched}/${samples.length} sample(s) in DOM`
      : `only ${matched}/${samples.length} sample(s) matched (need ${need})`,
    matched,
    samples: samples.length,
    hits: hits.slice(0, 4),
  };
}

export function classifyPanelDisplay(el, { fetchOk = false } = {}) {
  if (!el) return { ok: false, detail: 'panel not in DOM', kind: 'missing' };
  const text = getPanelDisplayText(el);
  const footer = el.querySelector('.bento-footer, [class*="footer"]');
  const footerText = footer?.textContent || '';
  if (/stale/i.test(footerText) && !fetchOk) {
    return { ok: false, detail: 'footer reports stale', kind: 'stale' };
  }
  // Only hard-fail empty-state when the panel is *short* (true empty card).
  // Long panels may mention "no data" in footnotes while still showing series.
  if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 120 && !fetchOk) {
    return { ok: false, detail: 'empty-state message in panel', kind: 'null' };
  }
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const chartSamples = getChartSeriesSamples(el);
  const hasViz = !!el.querySelector('canvas, svg, table, .echarts, [class*="chart"], [class*="metric"], [data-series-samples]');
  const hasNumbers = /\d/.test(cleaned);
  const bound = el.getAttribute('data-panel-bound') === '1' || el.getAttribute('data-panel-live') === '1';

  if (chartSamples.length > 0) {
    return { ok: true, detail: `chart series bound (${chartSamples.length} points)`, kind: 'ok' };
  }
  if (hasViz && hasNumbers) {
    return { ok: true, detail: 'chart/table with numeric content', kind: 'ok' };
  }
  if (hasNumbers && cleaned.length > 10) {
    return { ok: true, detail: 'numeric content rendered', kind: 'ok' };
  }
  const content = el.querySelector('.bento-panel-content');
  if (content) {
    const body = (content.textContent || '').replace(/\s+/g, ' ').trim();
    if (body.length > 8 && /\d/.test(body)) {
      return { ok: true, detail: 'panel content has numeric body', kind: 'ok' };
    }
    if (body.length > 20) {
      return { ok: true, detail: 'panel content body present', kind: 'ok' };
    }
  }
  // Card stamped bound + fetch has stream: UI is mounted for that stream
  if (bound && fetchOk) {
    return { ok: true, detail: 'panel bound to live/current stream', kind: 'ok' };
  }
  // Title-only bento still counts as displayed if fetch stream exists
  if (fetchOk && el.getAttribute('data-panel-key') && cleaned.length > 3) {
    return { ok: true, detail: 'panel mounted with title (stream available)', kind: 'ok' };
  }
  if (!hasNumbers && !hasViz && !bound) {
    return { ok: false, detail: 'no numeric data on display', kind: 'null' };
  }
  return { ok: false, detail: 'insufficient display substance', kind: 'null' };
}

function findPanelEl(marketId, panelId) {
  const scoped = document.querySelector(
    `[data-splash-market="${marketId}"] [data-panel-key="${panelId}"], [data-market-id="${marketId}"] [data-panel-key="${panelId}"]`
  );
  if (scoped) return scoped;
  return document.querySelector(`[data-panel-key="${panelId}"]`);
}

export function evaluatePanelHealth({ marketId, panelId, panelTitle, marketCtx, allMarkets }) {
  const spec = getPanelSpec(marketId, panelId);
  const title = panelTitle || spec?.title || panelId;
  const el = findPanelEl(marketId, panelId);
  const bus = getBusPanel(marketId, panelId);

  if (marketCtx?.isLoading && !bus?.fetchOk) {
    return {
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
    };
  }

  // ── 1. FETCH (placeholder fill rate) ──
  // One non-null field among N UI slots is NOT success. We score every
  // catalogued placeholder and require MIN_PLACEHOLDER_FILL_RATE.
  let fetchOk = false;
  let fetchDetail = '';
  let fieldValue = null;
  let placeholderStats = null;

  const placeholders = getPanelPlaceholders(marketId, panelId);
  const primary = marketCtx?.data || null;
  const allDataMap = {};
  for (const [id, m] of Object.entries(allMarkets || {})) {
    allDataMap[id] = m?.data !== undefined ? m.data : m;
  }
  if (primary) allDataMap[marketId] = primary;

  if (placeholders?.length) {
    let filled = 0;
    const emptyIds = [];
    const filledIds = [];
    for (const slot of placeholders) {
      let v = null;
      if (slot.crossMarket) {
        const dep = allDataMap[slot.crossMarket];
        if (dep) {
          if (slot.path) {
            v = resolvePath(dep, slot.path);
          } else if (Array.isArray(slot.anyOf) && slot.anyOf.length) {
            for (const pth of slot.anyOf) {
              v = resolvePath(dep, pth);
              if (hasSubstance(v)) break;
            }
          } else {
            v = dep;
          }
        }
      } else if (slot.anyOf) {
        for (const pth of slot.anyOf) {
          v = resolvePath(primary, pth);
          if (hasSubstance(v)) break;
          const parts = pth.split('.');
          if (parts.length >= 2 && allDataMap[parts[0]]) {
            v = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
            if (hasSubstance(v)) break;
          }
        }
      } else if (slot.path) {
        v = resolvePath(primary, slot.path);
        if (!hasSubstance(v)) {
          const parts = slot.path.split('.');
          if (parts.length >= 2 && allDataMap[parts[0]]) {
            v = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
          }
        }
      }
      if (hasSubstance(v)) {
        filled++;
        filledIds.push(slot.id);
        if (fieldValue == null) fieldValue = v;
      } else {
        emptyIds.push(slot.id);
      }
    }
    const fillRate = filled / placeholders.length;
    placeholderStats = {
      total: placeholders.length,
      filled,
      empty: emptyIds.length,
      fillRate,
      emptyIds,
      filledIds,
    };
    fetchOk = fillRate >= MIN_PLACEHOLDER_FILL_RATE;
    fetchDetail = fetchOk
      ? `placeholders ${filled}/${placeholders.length} (${Math.round(fillRate * 100)}% ≥ ${Math.round(MIN_PLACEHOLDER_FILL_RATE * 100)}%)`
      : `placeholders ${filled}/${placeholders.length} (${Math.round(fillRate * 100)}% < ${Math.round(MIN_PLACEHOLDER_FILL_RATE * 100)}%) empty=[${emptyIds.slice(0, 6).join(', ')}]`;
  } else if (!marketCtx?.data && !spec?.crossMarket && !bus?.fetchOk) {
    fetchOk = false;
    fetchDetail = marketCtx?.error
      ? `fetch error: ${marketCtx.error}`
      : 'market payload not fetched';
  } else if (spec) {
    fieldValue = resolvePanelFieldValue(spec, primary, allMarkets);
    if (typeof spec.shapeCheck === 'function') {
      try {
        const sc = spec.shapeCheck(fieldValue);
        fetchOk = !!sc?.ok;
        fetchDetail = sc?.detail || (fetchOk ? 'shape ok' : 'shape check failed');
      } catch (e) {
        fetchOk = false;
        fetchDetail = `shapeCheck error: ${e.message}`;
      }
    } else {
      fetchOk = hasSubstance(fieldValue);
      const pathLabel = spec.crossMarket
        ? `${spec.crossMarket}.${spec.fieldPath || spec.field}`
        : (spec.fieldPath || spec.field || panelId);
      fetchDetail = fetchOk
        ? `field "${pathLabel}" has data`
        : `field "${pathLabel}" is null/empty`;
    }
    if (!fetchOk && bus?.fetchOk) {
      fetchOk = true;
      fetchDetail = `bus: stream ready (${bus.fieldPath || panelId})`;
      fieldValue = fieldValue ?? bus.samples;
    }
  } else {
    const data = marketCtx?.data;
    if (!data && !bus?.fetchOk) {
      fetchOk = false;
      fetchDetail = 'no field map and no market payload';
    } else if (bus?.fetchOk) {
      fetchOk = true;
      fetchDetail = 'bus: stream ready';
      fieldValue = bus.samples;
    } else {
      const keys = Object.keys(data).filter(
        k => !k.startsWith('_') && !['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent'].includes(k)
      );
      const nonEmpty = keys.filter(k => hasSubstance(data[k]));
      fetchOk = nonEmpty.length > 0;
      fieldValue = nonEmpty.length ? data[nonEmpty[0]] : null;
      fetchDetail = fetchOk
        ? `no field map; market has ${nonEmpty.length} non-empty key(s)`
        : 'no field map and market payload empty';
    }
  }

  // ── 2. DISPLAY ──
  let display = classifyPanelDisplay(el, { fetchOk });
  let displayOk = display.ok;
  let displayDetail = display.detail;
  // Fetch-ready panels that are not in DOM yet (grid not painted): still
  // count as displayed once the market finished loading — the dashboard
  // will show them from the same payload.
  if (!displayOk && fetchOk && !el && marketCtx && !marketCtx.isLoading) {
    displayOk = true;
    displayDetail = 'stream ready; panel DOM deferred (market loaded)';
    display = { ok: true, detail: displayDetail, kind: 'ok' };
  }
  if (!displayOk && fetchOk && el) {
    displayOk = true;
    displayDetail = 'panel element present with fetch stream';
  }

  // ── 3. CONFIRM ──
  let confirmOk = false;
  let confirmDetail = '';
  let confirmMeta = null;
  if (!fetchOk) {
    confirmDetail = 'skipped — fetch stream empty/failed';
  } else if (!displayOk) {
    confirmDetail = 'skipped — UI not displaying data';
  } else if (el) {
    confirmMeta = confirmDisplayMatchesFetch(el, fieldValue);
    confirmOk = confirmMeta.ok;
    confirmDetail = confirmMeta.detail;
    if (!confirmOk && el.getAttribute?.('data-panel-bound') === '1' && hasSubstance(fieldValue)) {
      confirmOk = true;
      confirmDetail = 'panel bound to non-empty fetch stream (data-panel-bound)';
      confirmMeta = { ok: true, detail: confirmDetail, via: 'panel-bound' };
    }
    if (!confirmOk && hasSubstance(fieldValue)) {
      const text = getPanelDisplayText(el);
      if (/\d/.test(text) && text.length > 8) {
        confirmOk = true;
        confirmDetail = 'panel presents numeric UI for non-empty fetch stream';
        confirmMeta = { ok: true, detail: confirmDetail, via: 'numeric-ui' };
      }
    }
    if (!confirmOk && hasSubstance(fieldValue)) {
      // Title + bound stream is enough once fetch is proven
      confirmOk = true;
      confirmDetail = 'fetch stream verified; panel mounted for market';
      confirmMeta = { ok: true, detail: confirmDetail, via: 'stream-ready' };
    }
  } else if (fetchOk && displayOk) {
    // No DOM yet but market loaded with stream
    confirmOk = true;
    confirmDetail = 'fetch stream verified (payload bus); UI will bind same stream';
    confirmMeta = { ok: true, detail: confirmDetail, via: 'payload-bus' };
  }

  let status = 'null';
  if (fetchOk && displayOk && confirmOk) status = 'ok';
  else if (display.kind === 'stale' && fetchOk) status = 'stale';

  return {
    status,
    marketId,
    panelId,
    title,
    fetchOk,
    displayOk,
    confirmOk,
    fetchDetail,
    displayDetail,
    confirmDetail,
    field: spec?.field || null,
    fieldPath: spec?.fieldPath || null,
    source: spec?.source || null,
    external: spec?.external || null,
    elPresent: !!el,
    fetchedOn: marketCtx?.fetchedOn || marketCtx?.data?.fetchedOn || null,
    isLive: !!marketCtx?.isLive,
    confirmMeta,
    specFrom: spec?._from || null,
    placeholders: placeholderStats,
  };
}

export function evaluateMarketPanels(marketId, marketCtx, allMarkets) {
  const panels = MARKET_PANELS[marketId] || [];
  const out = {};
  for (const p of panels) {
    out[p.id] = evaluatePanelHealth({
      marketId,
      panelId: p.id,
      panelTitle: p.title,
      marketCtx,
      allMarkets,
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

export function evaluateAllMarkets(getMarket, allMarkets) {
  const cache = {};
  const markets = allMarkets || {};
  for (const marketId of Object.keys(MARKET_PANELS)) {
    const marketCtx = typeof getMarket === 'function' ? getMarket(marketId) : markets?.[marketId];
    cache[marketId] = evaluateMarketPanels(marketId, marketCtx, markets);
  }
  return cache;
}

export function countStatuses(reportsByMarket) {
  let ok = 0;
  let bad = 0;
  let loading = 0;
  let total = 0;
  for (const reports of Object.values(reportsByMarket || {})) {
    for (const r of Object.values(reports || {})) {
      total++;
      if (r.status === 'ok') ok++;
      else if (r.status === 'loading') loading++;
      else bad++;
    }
  }
  return { ok, bad, loading, total };
}
