import React, { useState, useEffect, useMemo } from 'react';
import { api, getApiInfo } from '../lib/api';
import DATA_SOURCES from './dataSources';
import { MARKETS } from './markets.config';
import {
  MARKET_ENDPOINTS,
  getMarketDependencyPaths,
  getRoutingRegistry,
} from './lib/marketEndpoints';
import { useDataContext } from './DataContext';
import './HubFooter.css';

const apiInfo = getApiInfo();

/**
 * Disk-cache keys on the server sometimes differ from hub market ids
 * (historical writeDailyCache names). Map tab id → cache status key(s).
 */
export const CACHE_STATUS_KEYS = {
  commodities: ['commodities_enhanced', 'commodities'],
  equitiesDeepDive: ['equityDeepDive', 'equitiesDeepDive'],
  equities: ['equities', 'stocks'],
};

/**
 * Resolve disk cache row for a hub market id (handles alias keys).
 * @param {object|null} cacheStatus  /api/cache/status body
 * @param {string} marketId
 */
export function resolveDiskCacheInfo(cacheStatus, marketId) {
  const status = cacheStatus?.status || {};
  const keys = CACHE_STATUS_KEYS[marketId] || [marketId];
  let best = null;
  for (const k of keys) {
    const row = status[k];
    if (!row) continue;
    if (row.isCurrent) return { ...row, cacheKey: k };
    if (row.fetchedOn && (!best || String(row.fetchedOn) > String(best.fetchedOn || ''))) {
      best = { ...row, cacheKey: k };
    } else if (!best) {
      best = { ...row, cacheKey: k };
    }
  }
  // Fallback: exact key only
  if (!best && status[marketId]) {
    best = { ...status[marketId], cacheKey: marketId };
  }
  return best;
}

/**
 * Derive footer chip kind from live session + disk cache.
 * Live DataProvider state wins over disk-only /api/cache/status.
 *
 * @returns {{
 *   kind: 'loading'|'live'|'current'|'stale'|'error'|'empty'|'federated',
 *   label: string,
 *   short: string,
 * }}
 */
export function deriveFooterChip(marketId, marketCtx, diskInfo, today) {
  const label = MARKETS.find((m) => m.id === marketId)?.label || marketId;
  const loading = !!marketCtx?.isLoading || !!marketCtx?.isRefreshing;
  const hasData = !!(marketCtx?.data && typeof marketCtx.data === 'object');
  const err = marketCtx?.error ? String(marketCtx.error) : '';
  const isLive = !!marketCtx?.isLive;
  const isStaleFlag = marketCtx?.isStale === true
    || marketCtx?.data?.isStale === true
    || /prior_day|error_fallback|gcs_prior/i.test(String(marketCtx?.data?._cacheSource || marketCtx?._cacheSource || ''));
  const isCurrent = !isStaleFlag && (
    marketCtx?.isCurrent === true
    || (diskInfo?.isCurrent === true && hasData)
    || (diskInfo?.isCurrent === true && !marketCtx)
  );
  const fetchedOn = marketCtx?.fetchedOn
    || marketCtx?.data?.fetchedOn
    || diskInfo?.fetchedOn
    || null;

  // Federated / client-only tabs (no primary endpoint)
  const endpoint = MARKET_ENDPOINTS[marketId];
  if (!endpoint && (marketId === 'alerts' || marketId === 'watchlist' || marketId === 'analytics')) {
    if (loading) return { kind: 'loading', label, short: `${label}…` };
    if (hasData || marketId === 'analytics') return { kind: 'federated', label, short: `${label} · app` };
    return { kind: 'empty', label, short: `${label} · —` };
  }

  if (loading && !hasData) {
    return { kind: 'loading', label, short: `${label}…` };
  }
  if (err && !hasData) {
    return { kind: 'error', label, short: `${label} ✗` };
  }
  if (isLive && hasData && !isStaleFlag) {
    return { kind: 'live', label, short: `${label} ●` };
  }
  // Explicit prior-day / last-good cache — show as-of date (not blank panels)
  if (hasData && (isStaleFlag || (fetchedOn && today && String(fetchedOn).slice(0, 10) !== today))) {
    const day = String(fetchedOn || '').slice(0, 10);
    const staleLabel = day && day.length >= 10 ? day.slice(5) : 'stale';
    return { kind: 'stale', label, short: `${label} · ${staleLabel}` };
  }
  if (isCurrent || (diskInfo?.isCurrent && (hasData || !marketCtx))) {
    // Disk/session same-day without this-request upstream
    return { kind: 'current', label, short: `${label} ✓` };
  }
  if (fetchedOn || hasData) {
    const day = String(fetchedOn || '').slice(0, 10);
    const staleLabel = day && today && day !== today ? day.slice(5) : 'stale';
    return { kind: 'stale', label, short: `${label} · ${staleLabel}` };
  }
  if (loading) {
    return { kind: 'loading', label, short: `${label}…` };
  }
  return { kind: 'empty', label, short: `${label} · no cache` };
}

/**
 * Multi-line title / tooltip: API provenance for a market chip.
 */
export function buildFooterChipTooltip({
  marketId,
  chip,
  marketCtx,
  diskInfo,
  today,
  cacheToday,
}) {
  const routing = getRoutingRegistry();
  const cfg = routing?.markets?.[marketId] || {};
  const primary = cfg.primary || MARKET_ENDPOINTS[marketId] || '(no primary endpoint)';
  const deps = getMarketDependencyPaths(marketId);
  const sources = DATA_SOURCES[marketId] || [];
  const lines = [];

  lines.push(`${chip.label} — data provenance`);
  lines.push('─'.repeat(28));

  // Session (what the UI is actually using)
  const sessionBits = [];
  if (marketCtx?.isLoading) sessionBits.push('loading');
  if (marketCtx?.isRefreshing) sessionBits.push('refreshing');
  if (marketCtx?.isLive) sessionBits.push('live this request');
  else if (marketCtx?.isCurrent) sessionBits.push('same-day cache');
  else if (marketCtx?.data) sessionBits.push('payload present');
  else sessionBits.push('no session payload');
  if (marketCtx?.error) sessionBits.push(`error: ${String(marketCtx.error).slice(0, 80)}`);
  lines.push(`Session: ${sessionBits.join(' · ')}`);

  const fetchedOn = marketCtx?.fetchedOn
    || marketCtx?.data?.fetchedOn
    || diskInfo?.fetchedOn
    || '—';
  lines.push(`Fetched on: ${fetchedOn}`);
  if (marketCtx?.lastUpdated) lines.push(`Last updated: ${marketCtx.lastUpdated}`);

  // Disk / Firestore meta index
  if (diskInfo) {
    const diskState = diskInfo.isCurrent
      ? 'current (today)'
      : diskInfo.fetchedOn
        ? `stale (${diskInfo.fetchedOn})`
        : 'missing';
    lines.push(`Cache index [${diskInfo.cacheKey || marketId}]: ${diskState}`);
    if (diskInfo.source) lines.push(`Index source: ${diskInfo.source}`);
    if (diskInfo.bytes != null) lines.push(`Payload size (last write): ${diskInfo.bytes} bytes`);
    if (diskInfo.keyCount != null) lines.push(`Top-level keys: ${diskInfo.keyCount}`);
    if (diskInfo.gcsPath) lines.push(`GCS: ${diskInfo.gcsPath}`);
    if (diskInfo.updatedAt || diskInfo.metaUpdatedAt) {
      lines.push(`Meta updated: ${diskInfo.updatedAt || diskInfo.metaUpdatedAt}`);
    }
  } else {
    lines.push('Cache index: no row (or not cacheable)');
  }
  if (cacheToday || today) {
    lines.push(`Server today: ${cacheToday || today}`);
  }

  lines.push('─'.repeat(28));
  lines.push(`Primary API: ${primary}`);
  if (deps.length) {
    lines.push('Dependencies:');
    for (const d of deps.slice(0, 12)) lines.push(`  · ${d}`);
    if (deps.length > 12) lines.push(`  · … +${deps.length - 12} more`);
  } else {
    lines.push('Dependencies: (none listed)');
  }

  if (sources.length) {
    lines.push('─'.repeat(28));
    lines.push('Upstream sources:');
    for (const s of sources) {
      const items = s.items ? ` — ${String(s.items).slice(0, 100)}` : '';
      lines.push(`  · ${s.name}${items}`);
    }
  }

  // Recent fetch log snippet
  const log = marketCtx?.fetchLog;
  if (Array.isArray(log) && log.length > 0) {
    const last = log[0];
    lines.push('─'.repeat(28));
    lines.push(`Last fetch log: ${last.url || '—'} · status ${last.status ?? '—'} · ${last.time || last.duration != null ? `${last.duration ?? ''}ms` : ''}`.trim());
  }

  lines.push('─'.repeat(28));
  lines.push(`Chip: ${chip.kind} · hover for provenance (session + disk + APIs)`);

  return lines.join('\n');
}

const KIND_CLASS = {
  loading: 'hub-badge hub-badge-loading',
  live: 'hub-badge hub-badge-live',
  current: 'hub-badge hub-badge-fresh',
  federated: 'hub-badge hub-badge-fed',
  stale: 'hub-badge hub-badge-stale',
  error: 'hub-badge hub-badge-error',
  empty: 'hub-badge hub-badge-none',
};

export default function HubFooter({ activeMarket }) {
  const [now, setNow] = useState(() => new Date());
  const [cacheStatus, setCacheStatus] = useState(null);
  const dataCtx = useDataContext();
  const markets = dataCtx?.markets;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const loadCacheStatus = () => {
    api.get('/api/cache/status')
      .then((data) => { if (data) setCacheStatus(data); })
      .catch(() => {});
  };

  useEffect(() => {
    loadCacheStatus();
    // Re-check disk cache periodically (session state updates live via context).
    const id = setInterval(loadCacheStatus, 120_000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const today = cacheStatus?.today || now.toISOString().slice(0, 10);

  const sources = DATA_SOURCES[activeMarket] || [];

  const chips = useMemo(() => {
    return MARKETS.map((m) => {
      const marketCtx = markets?.[m.id] || dataCtx?.getMarket?.(m.id) || null;
      const diskInfo = resolveDiskCacheInfo(cacheStatus, m.id);
      const chip = deriveFooterChip(m.id, marketCtx, diskInfo, today);
      const title = buildFooterChipTooltip({
        marketId: m.id,
        chip,
        marketCtx,
        diskInfo,
        today,
        cacheToday: cacheStatus?.today,
      });
      return {
        id: m.id,
        chip,
        title,
        active: m.id === activeMarket,
      };
    });
  }, [markets, cacheStatus, today, activeMarket, dataCtx]);

  return (
    <footer className="hub-footer" title={apiInfo.isExternal ? `Backend: ${apiInfo.base}` : 'Local dev (Vite proxy)'}>
      <span className="hub-footer-time">{dateStr} · {timeStr}</span>
      {apiInfo.isExternal && (
        <span className="hub-footer-backend" title={apiInfo.base}>
          api
        </span>
      )}

      <div className="hub-footer-badges" role="list" aria-label="Market data freshness">
        {chips.map(({ id, chip, title, active }) => (
          <span
            key={id}
            role="listitem"
            className={`${KIND_CLASS[chip.kind] || KIND_CLASS.empty}${active ? ' is-active' : ''}`}
            title={title}
            data-market={id}
            data-chip-kind={chip.kind}
          >
            {chip.short}
          </span>
        ))}
      </div>

      {/* Data source attribution for active market (links) */}
      {sources.length > 0 && (
        <div className="hub-footer-sources">
          <span className="hub-footer-sources-label">Sources:</span>
          {sources.map((src, i) => (
            <span key={src.name + i} className="hub-footer-source">
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${src.name}\n${src.items || ''}`}
              >
                {src.name}
              </a>
              {i < sources.length - 1 && <span className="hub-footer-dot"> · </span>}
            </span>
          ))}
        </div>
      )}
    </footer>
  );
}
