import React, { useMemo, useState } from 'react';
import './ListView.css';

const SECTOR_COLORS = {
  'Technology':  '#3b82f6',
  'Financials':  '#10b981',
  'Consumer':    '#f59e0b',
  'Healthcare':  '#ec4899',
  'Energy':      '#f97316',
  'Industrials': '#8b5cf6',
  'Crypto':      '#f7931a',
  'Other':       '#64748b',
};

const METRIC_META = {
  marketCap:  { col: 'Market Cap',  fmt: (item, r, s) => `${s}${((item.adjustedValue || item.value) * r).toLocaleString(undefined, { maximumFractionDigits: 0 })} B` },
  revenue:    { col: 'Revenue',     fmt: (item, r, s) => item.revenue    ? `${s}${(item.revenue    * r).toLocaleString(undefined, { maximumFractionDigits: 0 })} B` : '—' },
  netIncome:  { col: 'Net Income',  fmt: (item, r, s) => item.netIncome  ? `${s}${(item.netIncome  * r).toLocaleString(undefined, { maximumFractionDigits: 0 })} B` : '—' },
  pe:         { col: 'P/E Ratio',   fmt: (item) => item.pe        ? `${item.pe}x`        : '—' },
  divYield:   { col: 'Div. Yield',  fmt: (item) => item.divYield  ? `${item.divYield}%`  : '—' },
};

function GroupHeader({ label, color, count, totalVal, currentRate, currentSymbol }) {
  const total = (totalVal * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return (
    <tr className="lv-group-header">
      <td colSpan={7}>
        <span className="lv-group-dot" style={{ background: color }} />
        <span className="lv-group-name">{label}</span>
        <span className="lv-group-meta">{count} companies · {currentSymbol}{total} B</span>
      </td>
    </tr>
  );
}

const ListView = ({
  processedData,
  handleSort,
  renderSortIndicator,
  handleSelectTicker,
  currentRate,
  currentSymbol,
  currency,
  searchQuery,
  setSearchQuery,
  rankMetric = 'marketCap',
  groupBy    = 'market',
  snapshotDate,
}) => {
  const metricMeta = METRIC_META[rankMetric] || METRIC_META.marketCap;

  // Build grouped rows: [{ type:'header', label, color, count, totalVal } | { type:'row', item }]
  const rows = useMemo(() => {
    const out = [];

    if (groupBy === 'sectorGlobal') {
      const sectors = {};
      processedData.forEach(item => {
        const sec = item.sector || 'Other';
        if (!sectors[sec]) sectors[sec] = [];
        sectors[sec].push(item);
      });
      const sorted = Object.entries(sectors).sort(([, a], [, b]) =>
        b.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0) -
        a.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0)
      );
      sorted.forEach(([sec, items]) => {
        const totalVal = items.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0);
        out.push({ type: 'header', label: sec, color: SECTOR_COLORS[sec] || '#64748b', count: items.length, totalVal });
        items.forEach(item => out.push({ type: 'row', item }));
      });
    } else if (groupBy === 'market' || groupBy === 'sectorInMarket') {
      const regions = {};
      processedData.forEach(item => {
        const reg = item.region;
        if (!regions[reg]) regions[reg] = [];
        regions[reg].push(item);
      });
      const sorted = Object.entries(regions).sort(([, a], [, b]) =>
        b.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0) -
        a.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0)
      );
      sorted.forEach(([reg, items]) => {
        const totalVal = items.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0);
        out.push({ type: 'header', label: reg, color: items[0]?.regionColor || '#334155', count: items.length, totalVal });
        if (groupBy === 'sectorInMarket') {
          // Sub-group by sector within region
          const sectors = {};
          items.forEach(item => {
            const sec = item.sector || 'Other';
            if (!sectors[sec]) sectors[sec] = [];
            sectors[sec].push(item);
          });
          const secSorted = Object.entries(sectors).sort(([, a], [, b]) =>
            b.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0) -
            a.reduce((s, x) => s + (x.adjustedValue || x.value || 0), 0)
          );
          secSorted.forEach(([sec, secItems]) => {
            out.push({ type: 'subheader', label: sec, color: SECTOR_COLORS[sec] || '#64748b' });
            secItems.forEach(item => out.push({ type: 'row', item }));
          });
        } else {
          items.forEach(item => out.push({ type: 'row', item }));
        }
      });
    } else {
      processedData.forEach(item => out.push({ type: 'row', item }));
    }

    return out;
  }, [processedData, groupBy]);

  const showChange = !!snapshotDate;

  return (
    <div className="list-view">
      {/* Toolbar */}
      <div className="list-toolbar">
        <input
          type="text"
          placeholder="Search ticker or region…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="lv-toolbar-right">
          {snapshotDate && (
            <span className="lv-snapshot-badge">
              Historical · {snapshotDate}
            </span>
          )}
          <span className="results-count">{processedData.length} equities</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="lv-th-rank">#</th>
              <th onClick={() => handleSort('ticker')}>Ticker{renderSortIndicator('ticker')}</th>
              <th onClick={() => handleSort('fullName')}>Company{renderSortIndicator('fullName')}</th>
              <th>Sector</th>
              <th onClick={() => handleSort('region')}>Region{renderSortIndicator('region')}</th>
              <th className="text-right" onClick={() => handleSort('value')}>
                {metricMeta.col} ({currency}){renderSortIndicator('value')}
              </th>
              {showChange && <th className="text-right">vs Today</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              if (row.type === 'header') {
                return (
                  <GroupHeader
                    key={`h-${i}`}
                    label={row.label}
                    color={row.color}
                    count={row.count}
                    totalVal={row.totalVal}
                    currentRate={currentRate}
                    currentSymbol={currentSymbol}
                  />
                );
              }
              if (row.type === 'subheader') {
                return (
                  <tr key={`sh-${i}`} className="lv-subgroup-header">
                    <td colSpan={showChange ? 7 : 6}>
                      <span className="lv-subgroup-dot" style={{ background: row.color }} />
                      <span className="lv-subgroup-name">{row.label}</span>
                    </td>
                  </tr>
                );
              }

              const { item } = row;
              const metricStr = metricMeta.fmt(item, currentRate, currentSymbol);

              // % change vs today (adjustedValue vs marketCap baseline)
              let changePct = null;
              if (showChange && item.marketCap > 0) {
                const av = item.adjustedValue || item.value;
                changePct = ((av / item.marketCap - 1) * 100);
              }

              return (
                <tr key={`r-${item.ticker}-${i}`} className="clickable-row" onClick={() => handleSelectTicker(item)}>
                  <td className="lv-rank">
                    {item.rank ? <span className="lv-rank-num">{item.rank}</span> : null}
                  </td>
                  <td>
                    <div className="ticker-badge" style={{ backgroundColor: item.color }}>
                      {item.ticker}
                    </div>
                  </td>
                  <td className="lv-name">{item.fullName || item.ticker}</td>
                  <td>
                    {item.sector && (
                      <span className="lv-sector-chip" style={{
                        color: SECTOR_COLORS[item.sector] || '#64748b',
                        borderColor: `${SECTOR_COLORS[item.sector] || '#64748b'}55`,
                        background: `${SECTOR_COLORS[item.sector] || '#64748b'}18`,
                      }}>
                        {item.sector}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="region-indicator" style={{ borderLeftColor: item.regionColor }}>
                      {item.region}
                    </span>
                  </td>
                  <td className="text-right lv-metric">{metricStr}</td>
                  {showChange && (
                    <td className={`text-right lv-change ${changePct === null ? '' : changePct >= 0 ? 'text-green' : 'text-red'}`}>
                      {changePct !== null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%` : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
            {processedData.length === 0 && (
              <tr><td colSpan={showChange ? 7 : 6} className="empty-state">No equities match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
