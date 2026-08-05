import React, { useMemo } from 'react';
import { useMarketDigest } from '../../hooks/useMarketDigest';
import { useMarketData } from '../../hub/DataContext';
import './DigestKpiBar.css';

function formatNum(n, digits = 2) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pillsFromDigest(marketId, digest) {
  if (!digest || typeof digest !== 'object') return [];
  const kind = digest.kind || 'generic';
  const out = [];

  if (kind === 'bonds') {
    const r = digest.treasuryRates || digest.usCurve || {};
    if (r['10y'] != null || r['10Y'] != null) out.push({ label: '10Y', value: formatNum(r['10y'] ?? r['10Y']) + '%' });
    if (r['2y'] != null || r['2Y'] != null) out.push({ label: '2Y', value: formatNum(r['2y'] ?? r['2Y']) + '%' });
    if (digest.hyOas != null) out.push({ label: 'HY OAS', value: formatNum(digest.hyOas) });
    if (digest.igOas != null) out.push({ label: 'IG OAS', value: formatNum(digest.igOas) });
  } else if (kind === 'equities') {
    if (digest.quoteCount != null) out.push({ label: 'Quotes', value: String(digest.quoteCount) });
    if (digest.indexCount != null) out.push({ label: 'Indices', value: String(digest.indexCount) });
    const sample = digest.sampleQuotes || {};
    const first = Object.entries(sample)[0];
    if (first) out.push({ label: first[0], value: formatNum(first[1]?.p) });
  } else if (kind === 'crypto') {
    if (digest.fearGreed != null) out.push({ label: 'Fear', value: String(digest.fearGreed) });
    if (digest.btcDominance != null) out.push({ label: 'BTC dom', value: formatNum(digest.btcDominance) + '%' });
    const top = digest.top?.[0];
    if (top) out.push({ label: String(top.id || 'BTC').toUpperCase(), value: formatNum(top.price) });
  } else if (kind === 'fx') {
    const rates = digest.rates || {};
    for (const [k, v] of Object.entries(rates).slice(0, 4)) {
      out.push({ label: k, value: formatNum(v, 4) });
    }
  } else if (kind === 'credit') {
    if (digest.hyOas != null) out.push({ label: 'HY', value: formatNum(digest.hyOas) });
    if (digest.igOas != null) out.push({ label: 'IG', value: formatNum(digest.igOas) });
  } else if (kind === 'sentiment') {
    if (digest.fearGreed != null) out.push({ label: 'F&G', value: String(digest.fearGreed) });
    if (digest.vix != null) out.push({ label: 'VIX', value: formatNum(digest.vix) });
  } else {
    const sc = digest.scalars || {};
    for (const [k, v] of Object.entries(sc).slice(0, 4)) {
      out.push({ label: k, value: formatNum(v) });
    }
    if (digest.fieldsFilled != null) {
      out.push({ label: 'Fields', value: `${digest.fieldsFilled}/${digest.fieldsTotal || '?'}` });
    }
  }

  // Contract layer (shared/contracts digestKeys)
  if (digest.contract && typeof digest.contract === 'object' && out.length < 4) {
    for (const [k, v] of Object.entries(digest.contract)) {
      if (out.length >= 6) break;
      if (typeof v === 'number') out.push({ label: k, value: formatNum(v) });
      else if (v && typeof v === 'object' && !Array.isArray(v)) {
        const first = Object.entries(v).find(([, x]) => typeof x === 'number');
        if (first) out.push({ label: `${k}.${first[0]}`, value: formatNum(first[1]) });
      }
    }
  }

  if (digest.meta?.fetchedOn) {
    out.push({ label: 'As of', value: String(digest.meta.fetchedOn).slice(0, 10) });
  }
  return out.slice(0, 6);
}

/**
 * Thin progressive KPI bar while market bag is loading or empty.
 * Hides when full market data is already painted.
 */
export default function DigestKpiBar({ marketId }) {
  const market = useMarketData(marketId);
  const hasFull = !!(market?.data && !market?.isLoading);
  const { digest, status } = useMarketDigest(marketId, {
    enabled: !!marketId && !hasFull,
  });

  const pills = useMemo(() => pillsFromDigest(marketId, digest), [marketId, digest]);

  if (hasFull || !pills.length || status === 'error' || status === 'disabled') {
    return null;
  }

  return (
    <div className="digest-kpi-bar" role="status" aria-live="polite" title="Progressive digest from cache index (not full market bag)">
      <span className="digest-kpi-bar-label">
        {status === 'loading' ? 'Digest…' : 'Digest'}
      </span>
      {pills.map((p) => (
        <span key={p.label} className="digest-kpi-pill">
          <span className="digest-kpi-k">{p.label}</span>
          <span className="digest-kpi-v">{p.value}</span>
        </span>
      ))}
    </div>
  );
}
