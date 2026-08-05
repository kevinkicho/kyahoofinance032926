import React, { useMemo } from 'react';
import './ProgressiveSlicePreview.css';

function fmt(n, d = 2) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
}

/**
 * Classify a field value into a renderable progressive view.
 * @returns {{ mode: 'kpi'|'table'|'list'|'series'|'raw', ... }}
 */
export function classifyFieldValue(path, val) {
  if (val == null) return { mode: 'raw', path, display: '—' };
  if (typeof val === 'number') return { mode: 'kpi', path, label: path.split('.').pop(), value: fmt(val) };
  if (typeof val === 'string') return { mode: 'kpi', path, label: path.split('.').pop(), value: val.slice(0, 64) };

  if (Array.isArray(val)) {
    if (val.length === 0) return { mode: 'raw', path, display: '[]' };
    // Series of numbers
    if (typeof val[0] === 'number') {
      return {
        mode: 'series',
        path,
        label: path.split('.').pop(),
        latest: fmt(val[val.length - 1]),
        n: val.length,
      };
    }
    // Array of objects → table rows
    if (val[0] && typeof val[0] === 'object') {
      const keys = Object.keys(val[0]).filter((k) => !k.startsWith('_')).slice(0, 5);
      const rows = val.slice(0, 12).map((row) => keys.map((k) => {
        const x = row[k];
        if (typeof x === 'number') return fmt(x);
        if (x == null) return '—';
        return String(x).slice(0, 24);
      }));
      return { mode: 'table', path, columns: keys, rows, total: val.length };
    }
    return { mode: 'list', path, items: val.slice(0, 8).map(String), total: val.length };
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val).filter((k) => !k.startsWith('_'));
    // Quote map: { AAPL: { price, changePct } }
    const sample = keys.slice(0, 16).map((k) => val[k]);
    const looksLikeQuotes = sample.some((q) => q && typeof q === 'object' && (q.price != null || q.p != null || q.changePct != null));
    if (looksLikeQuotes) {
      const rows = keys.slice(0, 14).map((ticker) => {
        const q = val[ticker] || {};
        const price = q.price ?? q.p;
        const ch = q.changePct ?? q.cp;
        return [ticker, fmt(price), ch != null ? `${Number(ch) >= 0 ? '+' : ''}${fmt(ch)}%` : '—'];
      });
      return {
        mode: 'table',
        path,
        columns: ['Ticker', 'Price', 'Chg%'],
        rows,
        total: keys.length,
      };
    }
    // Rate / curve map: { '10y': 4.2, '2y': 3.9 }
    const numericEntries = keys
      .filter((k) => typeof val[k] === 'number')
      .slice(0, 16)
      .map((k) => ({ label: k, value: fmt(val[k]) }));
    if (numericEntries.length >= 2) {
      return { mode: 'kpi-grid', path, items: numericEntries, total: keys.length };
    }
    // Nested US curve etc.
    if (val.US && typeof val.US === 'object') {
      return classifyFieldValue(`${path}.US`, val.US);
    }
    if (Array.isArray(val.values) && val.values.length) {
      return classifyFieldValue(`${path}.values`, val.values);
    }
    if (typeof val.latest === 'number') {
      return { mode: 'kpi', path, label: path.split('.').pop(), value: fmt(val.latest) };
    }
    // Generic object KPIs
    const items = [];
    for (const k of keys.slice(0, 12)) {
      const v = val[k];
      if (typeof v === 'number') items.push({ label: k, value: fmt(v) });
      else if (v && typeof v === 'object' && typeof v.value === 'number') items.push({ label: k, value: fmt(v.value) });
    }
    if (items.length) return { mode: 'kpi-grid', path, items, total: keys.length };
    return { mode: 'raw', path, display: `object(${keys.length})` };
  }

  return { mode: 'raw', path, display: String(val).slice(0, 48) };
}

/**
 * Progressive panel body from /api/panel slice fields.
 * Renders tables / KPI grids when possible — not only path:summary lines.
 */
export default function ProgressiveSlicePreview({ title, slice, status }) {
  const views = useMemo(() => {
    const fields = slice?.fields || {};
    return Object.entries(fields).map(([path, val]) => classifyFieldValue(path.replace(/^\$cross\./, '⊕ '), val));
  }, [slice]);

  if (status === 'loading') {
    return (
      <div className="psp-root" data-panel-loading="1">
        <div className="psp-title">Loading {title || 'panel'}…</div>
        <div className="psp-hint">Fetching cached slice</div>
      </div>
    );
  }

  if (!views.length) {
    return (
      <div className="psp-root" data-panel-loading="1">
        <div className="psp-title">{title || 'Panel'}</div>
        <div className="psp-hint">
          {status === 'error' ? 'Slice unavailable — waiting for market wave' : 'Waiting for market data…'}
        </div>
      </div>
    );
  }

  return (
    <div className="psp-root psp-root--rich" data-progressive-slice="1">
      <div className="psp-kicker">Progressive slice · full panel loads when market ready</div>
      <div className="psp-title">{title}</div>
      {views.map((v) => {
        if (v.mode === 'table') {
          return (
            <div key={v.path} className="psp-block">
              <div className="psp-block-label">{v.path}{v.total > v.rows.length ? ` · ${v.rows.length}/${v.total}` : ''}</div>
              <div className="psp-table-wrap">
                <table className="psp-table">
                  <thead>
                    <tr>{v.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {v.rows.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        if (v.mode === 'kpi-grid') {
          return (
            <div key={v.path} className="psp-block">
              <div className="psp-block-label">{v.path}</div>
              <div className="psp-kpi-grid">
                {v.items.map((it) => (
                  <div key={it.label} className="psp-kpi">
                    <span className="psp-kpi-l">{it.label}</span>
                    <span className="psp-kpi-v">{it.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (v.mode === 'series') {
          return (
            <div key={v.path} className="psp-kpi psp-kpi--wide">
              <span className="psp-kpi-l">{v.label} (n={v.n})</span>
              <span className="psp-kpi-v">{v.latest}</span>
            </div>
          );
        }
        if (v.mode === 'kpi') {
          return (
            <div key={v.path} className="psp-kpi">
              <span className="psp-kpi-l">{v.label}</span>
              <span className="psp-kpi-v">{v.value}</span>
            </div>
          );
        }
        if (v.mode === 'list') {
          return (
            <div key={v.path} className="psp-block">
              <div className="psp-block-label">{v.path} · {v.total}</div>
              <div className="psp-hint">{v.items.join(' · ')}</div>
            </div>
          );
        }
        return (
          <div key={v.path} className="psp-list-line">
            <span className="psp-path">{v.path}</span>
            <span className="psp-val">{v.display}</span>
          </div>
        );
      })}
      {slice?.fetchedOn && (
        <div className="psp-meta">as of {String(slice.fetchedOn).slice(0, 10)} · cache slice</div>
      )}
    </div>
  );
}
