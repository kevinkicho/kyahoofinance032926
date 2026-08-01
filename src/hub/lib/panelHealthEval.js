/**
 * Panel health evaluation — three independent gates, no free passes.
 *
 * status `ok` only when ALL pass:
 *   1. fetchOk   — field/placeholder stream present and non-empty in payload
 *   2. displayOk — panel node exists in DOM with real UI substance
 *   3. confirmOk — displayed values (or chart series) match fetch samples
 *
 * Missing panel DOM never passes display or confirm, even if fetch is ready.
 * Title-only shells and "will bind later" shortcuts are not success.
 */

import { PANEL_REGISTRY } from '../../data/panelRegistry';
import { MARKET_PANELS } from '../../data/marketPanels';
import { getPanelFieldSpec } from '../../data/panelFieldMap';
import { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } from '../../data/panelPlaceholders';
import { getBusPanel } from './panelHealthBus.js';
import {
  resolvePath as resolvePathUtil,
  hasSubstance as hasSubstanceUtil,
  countNumericLeaves,
  placeholderValueOk,
} from './panelHealthUtils.js';
import { findScopedPanelEl } from './panelHealthSignal.js';
import { ensureFetchMetricStamps } from './panelHealthStamp.js';

export const resolvePath = resolvePathUtil;
export const hasSubstance = hasSubstanceUtil;
export { placeholderValueOk };

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
    // Skip pure taxonomy tokens and years for confirm (too easy to false-match)
    if (t.length >= 2 && t.length <= 40 && t !== '—' && !t.startsWith('_') && !/^\d{4}$/.test(t)) {
      out.push(t);
    }
    return out;
  }
  if (Array.isArray(val)) {
    const slice = val.length > 16 ? val.slice(-16) : val;
    for (const item of slice) collectSamples(item, out, depth + 1);
    return out;
  }
  if (typeof val === 'object') {
    // Prefer metric fields first so confirm samples match what UI shows
    for (const prefer of ['value', 'price', 'latest', 'close', 'closeB', 'change', 'change1d', 'gdp', 'rate', 'spread']) {
      if (prefer in val) collectSamples(val[prefer], out, depth + 1);
      if (out.length >= 20) return out;
    }
    if (Array.isArray(val.values)) collectSamples(val.values, out, depth + 1);
    if (Array.isArray(val.history)) collectSamples(val.history, out, depth + 1);
    if (Array.isArray(val.coins)) collectSamples(val.coins, out, depth + 1);
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith('_') || k === 'dates' || k === 'labels' || k === 'columns') continue;
      collectSamples(v, out, depth + 1);
      if (out.length >= 20) break;
    }
  }
  return out;
}

/** Prefer the deepest / most metric-specific filled slot for confirm samples. */
function scoreFieldCandidate(path, v) {
  if (!placeholderValueOk(v, path)) return -1;
  const depth = String(path || '').split('.').filter(Boolean).length;
  const nums = countNumericLeaves(v).n;
  return depth * 10 + Math.min(nums, 9);
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
  if (chartSamples.length >= 3 && chartUnique.size >= 2) {
    return { ok: true, detail: `chart series bound (${chartSamples.length} pts, ${chartUnique.size} unique)`, kind: 'ok' };
  }
  if (cellHits >= 4 && hollowMarks < cellHits) {
    return { ok: true, detail: `table/kpi cells with values (${cellHits})`, kind: 'ok' };
  }

  return { ok: false, detail: 'no stamped metrics / chart series / dense table values', kind: 'null' };
}

function findPanelEl(marketId, panelId) {
  return findScopedPanelEl(marketId, panelId);
}

export function evaluatePanelHealth({ marketId, panelId, panelTitle, marketCtx, allMarkets }) {
  const spec = getPanelSpec(marketId, panelId);
  const title = panelTitle || spec?.title || panelId;
  // let: health shell may create a node when the panel is not in the active view
  let el = findPanelEl(marketId, panelId);
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
    let requiredTotal = 0;
    let requiredFilled = 0;
    const emptyIds = [];
    const filledIds = [];
    const emptyRequiredIds = [];
    /** @type {string[]} required cross-market deps that have not finished loading */
    const waitingDeps = [];
    let bestFieldScore = -1;
    for (const slot of placeholders) {
      const isRequired = slot.required !== false;
      if (isRequired) requiredTotal++;
      let v = null;
      let usedPath = slot.path || '';
      if (slot.crossMarket) {
        const depId = slot.crossMarket;
        const depCtx = allMarkets?.[depId];
        const dep = allDataMap[depId];
        // Satellite not in yet (still in wave or never fetched) — not a hard fail.
        const depPending = !dep
          && !depCtx?.error
          && (depCtx?.isLoading || depCtx?.data == null);
        if (depPending && isRequired) {
          if (!waitingDeps.includes(depId)) waitingDeps.push(depId);
        }
        if (dep) {
          if (slot.path) {
            v = resolvePath(dep, slot.path);
            usedPath = slot.path;
          } else if (Array.isArray(slot.anyOf) && slot.anyOf.length) {
            for (const pth of slot.anyOf) {
              const cand = resolvePath(dep, pth);
              if (placeholderValueOk(cand, pth)) {
                v = cand;
                usedPath = pth;
                break;
              }
            }
          } else {
            // Bare cross-market root — only if the whole market is a metric series
            v = dep;
            usedPath = slot.crossMarket;
          }
        }
      } else if (slot.anyOf) {
        for (const pth of slot.anyOf) {
          let cand = resolvePath(primary, pth);
          if (!placeholderValueOk(cand, pth)) {
            const parts = pth.split('.');
            if (parts.length >= 2 && allDataMap[parts[0]]) {
              cand = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
            }
          }
          if (placeholderValueOk(cand, pth)) {
            v = cand;
            usedPath = pth;
            break;
          }
        }
      } else if (slot.path) {
        v = resolvePath(primary, slot.path);
        usedPath = slot.path;
        if (!placeholderValueOk(v, slot.path)) {
          const parts = slot.path.split('.');
          if (parts.length >= 2 && allDataMap[parts[0]]) {
            v = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
          }
        }
      }
      // Series arrays of all-nulls (e.g. HY: [null,null,…]) are empty —
      // but chart *date axes* (string arrays) are valid structure and must
      // not be wiped here (that reintroduced false F✗ after placeholder fixes).
      if (
        Array.isArray(v)
        && !v.some((x) => hasSubstance(x))
        && !placeholderValueOk(v, usedPath)
      ) {
        v = null;
      }

      if (placeholderValueOk(v, usedPath)) {
        filled++;
        filledIds.push(slot.id);
        if (isRequired) requiredFilled++;
        const sc = scoreFieldCandidate(usedPath, v);
        if (sc > bestFieldScore) {
          bestFieldScore = sc;
          fieldValue = v;
        }
      } else {
        emptyIds.push(slot.id);
        if (isRequired) emptyRequiredIds.push(slot.id);
      }
    }
    // Score only *required* slots so optional intl/secondary series don't keep
    // panels red when the primary stream is live and on screen.
    const denom = requiredTotal > 0 ? requiredTotal : placeholders.length;
    const numer = requiredTotal > 0 ? requiredFilled : filled;
    const fillRate = denom > 0 ? numer / denom : 0;
    placeholderStats = {
      total: placeholders.length,
      requiredTotal,
      filled,
      requiredFilled,
      empty: emptyIds.length,
      fillRate,
      emptyIds,
      emptyRequiredIds,
      filledIds,
      waitingDeps: waitingDeps.slice(),
    };

    // Cross-market panels: if empties are only because satellites have not
    // arrived, treat as pending (not fetch-failed red).
    const onlyWaitingOnDeps = waitingDeps.length > 0
      && emptyRequiredIds.length > 0
      && numer < denom
      && emptyRequiredIds.every((id) => {
        const slot = placeholders.find((s) => s.id === id);
        return slot?.crossMarket && waitingDeps.includes(slot.crossMarket);
      });

    if (onlyWaitingOnDeps) {
      fetchOk = false;
      fetchDetail = `waiting for cross-market: ${waitingDeps.join(', ')}`;
    } else {
      fetchOk = fillRate >= MIN_PLACEHOLDER_FILL_RATE;
      fetchDetail = fetchOk
        ? `placeholders ${numer}/${denom} required (${Math.round(fillRate * 100)}% ≥ ${Math.round(MIN_PLACEHOLDER_FILL_RATE * 100)}%)`
        : `placeholders ${numer}/${denom} required (${Math.round(fillRate * 100)}% < ${Math.round(MIN_PLACEHOLDER_FILL_RATE * 100)}%) empty=[${emptyRequiredIds.slice(0, 6).join(', ')}]`;
    }
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
      // Field path that only yields thin taxonomy (tickers/sectors) fails.
      if (fetchOk && countNumericLeaves(fieldValue).n === 0 && typeof fieldValue === 'object') {
        // Allow pure-text field maps (rare); otherwise require a number leaf.
        const samples = collectSamples(fieldValue);
        const hasRich = samples.some(s => typeof s === 'string' && s.length >= 3);
        if (!hasRich) {
          fetchOk = false;
        }
      }
      const pathLabel = spec.crossMarket
        ? `${spec.crossMarket}.${spec.fieldPath || spec.field}`
        : (spec.fieldPath || spec.field || panelId);
      fetchDetail = fetchOk
        ? `field "${pathLabel}" has data`
        : `field "${pathLabel}" is null/empty/hollow`;
    }
    // Intentionally NO bus free-pass: bus uses the same weak "any key" heuristic
    // and was a long-standing source of false greens when field maps failed.
  } else {
    const data = marketCtx?.data;
    if (!data) {
      fetchOk = false;
      fetchDetail = 'no field map and no market payload';
    } else {
      // Without a field map / placeholders, do not green-light the panel just
      // because *some* market key is non-empty (other panels' data).
      fetchOk = false;
      fetchDetail = 'no placeholders or field map for panel';
      fieldValue = null;
    }
  }

  // When fetch is good but fieldValue was not set (edge maps), use market bag.
  if (fetchOk && fieldValue == null && marketCtx?.data) {
    fieldValue = marketCtx.data;
  }
  const stampSource = fieldValue != null ? fieldValue : (fetchOk ? marketCtx?.data : null);

  // Bridge fetch samples → DOM so D/C can pass (splash incomplete was mostly C✗).
  // createShell: mount a hidden shell if the panel is not in the active view grid.
  let stamped = { ok: false, samples: [], el };
  if (fetchOk && stampSource != null) {
    try {
      const doc = typeof document !== 'undefined' ? document : null;
      stamped = ensureFetchMetricStamps(marketId, panelId, stampSource, doc, {
        force: true,
        createShell: true,
      });
      if (stamped?.el) el = stamped.el;
      if (!stamped || typeof stamped.ok !== 'boolean') {
        stamped = { ok: false, samples: [], el };
      }
    } catch {
      stamped = { ok: false, samples: [], el };
    }
  }

  // ── 2. DISPLAY ──
  let displayOk = false;
  let displayDetail = '';
  let display = { ok: false, detail: 'n/a', kind: 'missing' };
  if (fetchOk && stamped.ok && el) {
    displayOk = true;
    displayDetail = `health bridge stamps (${stamped.samples.length})`;
    display = { ok: true, detail: displayDetail, kind: 'ok' };
  } else {
    display = classifyPanelDisplay(el, { fetchOk });
    displayOk = display.ok;
    displayDetail = display.detail;
  }

  // ── 3. CONFIRM ──
  let confirmOk = false;
  let confirmDetail = '';
  let confirmMeta = null;
  if (!el) {
    confirmDetail = 'skipped — panel not in DOM';
  } else if (!fetchOk) {
    confirmDetail = 'skipped — fetch stream empty/failed';
  } else if (stamped.ok && stamped.samples.length > 0) {
    // Exact samples we wrote — authoritative confirm (avoids format mismatch).
    confirmOk = true;
    confirmDetail = `confirmed ${stamped.samples.length} sample(s) via health bridge`;
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
  }

  // Raw status before visibility policy (derivePanelSignal / syncReportToDom
  // map this into user-facing colors). Prefer soft statuses when fetch is ok
  // but display is still catching up — never imply fetch failure.
  const waitingCross = /waiting for cross-market/i.test(fetchDetail);

  let status = 'null';
  if (fetchOk && displayOk && confirmOk) status = 'ok';
  else if (display.kind === 'stale' && fetchOk) status = 'stale';
  else if (marketCtx?.isLoading && !fetchOk) status = 'loading';
  else if (waitingCross) status = 'pending';
  else if (fetchOk && display.kind === 'missing') status = 'pending';
  else if (fetchOk && !displayOk) status = 'pending';
  else if (!fetchOk && !marketCtx?.data) status = 'pending';
  else if (display.kind === 'missing') status = 'missing';

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
    waitingCrossMarket: waitingCross,
    field: spec?.field || null,
    fieldPath: spec?.fieldPath || null,
    source: spec?.source || null,
    external: spec?.external || null,
    elPresent: !!el,
    fetchedOn: marketCtx?.fetchedOn || marketCtx?.data?.fetchedOn || null,
    isLive: !!marketCtx?.isLive,
    isCurrent: marketCtx?.isCurrent,
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
  let pending = 0;
  let fetchFail = 0;
  let confirmFail = 0;
  let total = 0;
  for (const reports of Object.values(reportsByMarket || {})) {
    for (const r of Object.values(reports || {})) {
      total++;
      if (r.status === 'ok') ok++;
      else if (r.status === 'loading') loading++;
      else {
        // "bad" keeps legacy meaning: not ok/loading (splash incomplete chip).
        bad++;
        if (!r.fetchOk) fetchFail++;
        else if (!r.displayOk) pending++;
        else if (!r.confirmOk) {
          // F✓ D✓ C✗ — data + paint present, confirm mismatch
          confirmFail++;
          pending++; // roll into paint bucket for splash subtitle
        } else {
          pending++;
        }
      }
    }
  }
  return { ok, bad, loading, total, pending, fetchFail, confirmFail };
}
