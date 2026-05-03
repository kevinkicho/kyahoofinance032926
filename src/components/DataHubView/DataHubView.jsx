import React, { useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import './DataHubView.css';

const SECTOR_COLORS = {
  Technology: '#3b82f6',
  Financials: '#10b981',
  Consumer: '#f59e0b',
  Healthcare: '#ec4899',
  Energy: '#f97316',
  Industrials: '#8b5cf6',
  Crypto: '#f7931a',
  Other: '#64748b',
};

const COLUMNS = [
  { key: 'ticker', label: 'Ticker', sortable: true },
  { key: 'fullName', label: 'Company', sortable: true },
  { key: 'sector', label: 'Sector', sortable: true },
  { key: 'region', label: 'Region', sortable: true },
  { key: 'marketCap', label: 'Mkt Cap ($B)', sortable: true, numeric: true },
  { key: 'revenue', label: 'Revenue ($B)', sortable: true, numeric: true },
  { key: 'netIncome', label: 'Net Inc ($B)', sortable: true, numeric: true },
  { key: 'pe', label: 'P/E', sortable: true, numeric: true },
  { key: 'divYield', label: 'Div Yield', sortable: true, numeric: true },
  { key: 'profitMargin', label: 'Profit Margin', sortable: true, numeric: true },
  { key: 'revToCap', label: 'Rev/Cap', sortable: true, numeric: true },
];

function fmtB(val, rate, symbol) {
  if (val == null || val === 0) return '—';
  return `${symbol}${(val * rate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

function fmtPct(val) {
  if (val == null) return '—';
  return `${val.toFixed(1)}%`;
}

function fmtPe(val) {
  if (val == null || val === 999 || val <= 0) return '—';
  return `${val.toFixed(1)}x`;
}

function fmtRatio(val) {
  if (val == null) return '—';
  return val.toFixed(2);
}

const DataHubView = ({ flatData, currentRate, currentSymbol, currency, onRowClick }) => {
  const { colors } = useTheme();
  const [sortKey, setSortKey] = useState('marketCap');
  const [sortDir, setSortDir] = useState('desc');
  const [filterSector, setFilterSector] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [search, setSearch] = useState('');

  const sectors = useMemo(() => {
    const set = new Set(flatData.map(d => d.sector).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [flatData]);

  const regions = useMemo(() => {
    const set = new Set(flatData.map(d => d.region).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [flatData]);

  const enriched = useMemo(() => {
    return flatData.map(item => {
      const margin = (item.netIncome && item.revenue && item.revenue > 0)
        ? (item.netIncome / item.revenue) * 100
        : null;
      const revToCap = (item.revenue && (item.adjustedValue || item.value) && (item.adjustedValue || item.value) > 0)
        ? item.revenue / (item.adjustedValue || item.value)
        : null;
      return { ...item, profitMargin: margin, revToCap };
    });
  }, [flatData]);

  const sorted = useMemo(() => {
    let filtered = enriched;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        d.ticker?.toLowerCase().includes(q) ||
        d.fullName?.toLowerCase().includes(q) ||
        d.sector?.toLowerCase().includes(q) ||
        d.region?.toLowerCase().includes(q)
      );
    }
    if (filterSector !== 'all') {
      filtered = filtered.filter(d => d.sector === filterSector);
    }
    if (filterRegion !== 'all') {
      filtered = filtered.filter(d => d.region === filterRegion);
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const col = COLUMNS.find(c => c.key === sortKey);
    if (col?.numeric) {
      filtered.sort((a, b) => {
        const av = a[sortKey] ?? -Infinity;
        const bv = b[sortKey] ?? -Infinity;
        return (av - bv) * dir;
      });
    } else {
      filtered.sort((a, b) => {
        const av = (a[sortKey] || '').toString().toLowerCase();
        const bv = (b[sortKey] || '').toString().toLowerCase();
        return av.localeCompare(bv) * dir;
      });
    }
    return filtered;
  }, [enriched, search, filterSector, filterRegion, sortKey, sortDir]);

  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const sortIndicator = (key) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const summaryStats = useMemo(() => {
    const totalMcap = enriched.reduce((s, d) => s + (d.adjustedValue || d.value || 0), 0);
    const totalRev = enriched.reduce((s, d) => s + (d.revenue || 0), 0);
    const totalNI = enriched.reduce((s, d) => s + (d.netIncome || 0), 0);
    const withPe = enriched.filter(d => d.pe != null && d.pe > 0 && d.pe < 999);
    const avgPe = withPe.length ? withPe.reduce((s, d) => s + d.pe, 0) / withPe.length : null;
    const withDiv = enriched.filter(d => d.divYield > 0);
    const avgDiv = withDiv.length ? withDiv.reduce((s, d) => s + d.divYield, 0) / withDiv.length : null;
    const withMargin = enriched.filter(d => d.profitMargin != null);
    const avgMargin = withMargin.length ? withMargin.reduce((s, d) => s + d.profitMargin, 0) / withMargin.length : null;
    return { count: enriched.length, totalMcap, totalRev, totalNI, avgPe, avgDiv, avgMargin };
  }, [enriched]);

  return (
    <div className="dh-wrapper">
      <div className="dh-toolbar">
        <input
          type="text"
          className="dh-search"
          placeholder="Search ticker, company, sector…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="dh-filter" value={filterSector} onChange={e => setFilterSector(e.target.value)}>
          {sectors.map(s => <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>)}
        </select>
        <select className="dh-filter" value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
          {regions.map(r => <option key={r} value={r}>{r === 'all' ? 'All Regions' : r}</option>)}
        </select>
        <span className="dh-count">{sorted.length} of {flatData.length} equities</span>
      </div>
      <div className="dh-kpi-strip">
        <div className="dh-kpi">
          <span className="dh-kpi-label">Total Mkt Cap</span>
          <span className="dh-kpi-value">{currentSymbol}{(summaryStats.totalMcap * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} B</span>
        </div>
        <div className="dh-kpi">
          <span className="dh-kpi-label">Total Revenue</span>
          <span className="dh-kpi-value">{currentSymbol}{(summaryStats.totalRev * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} B</span>
        </div>
        <div className="dh-kpi">
          <span className="dh-kpi-label">Total Net Income</span>
          <span className="dh-kpi-value">{currentSymbol}{(summaryStats.totalNI * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} B</span>
        </div>
        <div className="dh-kpi">
          <span className="dh-kpi-label">Avg P/E</span>
          <span className="dh-kpi-value">{summaryStats.avgPe != null ? `${summaryStats.avgPe.toFixed(1)}x` : '—'}</span>
        </div>
        <div className="dh-kpi">
          <span className="dh-kpi-label">Avg Div Yield</span>
          <span className="dh-kpi-value">{summaryStats.avgDiv != null ? `${summaryStats.avgDiv.toFixed(2)}%` : '—'}</span>
        </div>
        <div className="dh-kpi">
          <span className="dh-kpi-label">Avg Margin</span>
          <span className="dh-kpi-value">{summaryStats.avgMargin != null ? `${summaryStats.avgMargin.toFixed(1)}%` : '—'}</span>
        </div>
      </div>
      <div className="dh-table-scroll">
        <table className="dh-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`dh-th${col.numeric ? ' dh-th-num' : ''}${col.sortable ? ' dh-th-sort' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  {col.label}{sortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => (
              <tr key={item.ticker} className="dh-row" onClick={() => onRowClick?.(item)}>
                <td className="dh-td-ticker">
                  <span className="dh-ticker-badge" style={{ backgroundColor: item.color }}>
                    {item.ticker}
                  </span>
                </td>
                <td className="dh-td-name">{item.fullName || item.ticker}</td>
                <td>
                  <span className="dh-sector-chip" style={{
                    color: SECTOR_COLORS[item.sector] || '#64748b',
                    borderColor: `${SECTOR_COLORS[item.sector] || '#64748b'}55`,
                    background: `${SECTOR_COLORS[item.sector] || '#64748b'}18`,
                  }}>
                    {item.sector}
                  </span>
                </td>
                <td>
                  <span className="dh-region-indicator" style={{ borderLeftColor: item.regionColor }}>
                    {item.region}
                  </span>
                </td>
                <td className="dh-td-num">{fmtB(item.adjustedValue || item.value, currentRate, currentSymbol)}</td>
                <td className="dh-td-num">{fmtB(item.revenue, currentRate, currentSymbol)}</td>
                <td className="dh-td-num">{fmtB(item.netIncome, currentRate, currentSymbol)}</td>
                <td className="dh-td-num">{fmtPe(item.pe)}</td>
                <td className="dh-td-num">{fmtPct(item.divYield)}</td>
                <td className="dh-td-num">{fmtPct(item.profitMargin)}</td>
                <td className="dh-td-num">{fmtRatio(item.revToCap)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="dh-empty">No equities match filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataHubView;
