import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { apiUrl } from '../../../lib/api';
import SafeECharts from '../../../components/SafeECharts';
import DataFooter from '../../../components/DataFooter/DataFooter';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import BentoWrapper from '../../../components/BentoWrapper';
import './MLExplorer.css';

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

function computeMomentumScore(item, allItems) {
  let score = 50;

  if (item.changePct != null) {
    if (item.changePct > 5) score += 25;
    else if (item.changePct > 2) score += 18;
    else if (item.changePct > 0) score += 10;
    else if (item.changePct > -2) score -= 5;
    else if (item.changePct > -5) score -= 15;
    else score -= 25;
  }

  if (item.weekHigh52 != null && item.price != null && item.weekHigh52 > 0) {
    const proximity = item.price / item.weekHigh52;
    if (proximity > 0.95) score += 15;
    else if (proximity > 0.85) score += 10;
    else if (proximity > 0.7) score += 5;
    else score -= 5;
  }

  if (item.weekLow52 != null && item.price != null && item.weekLow52 > 0) {
    const above = (item.price - item.weekLow52) / item.weekLow52;
    if (above > 0.5) score += 5;
    else if (above < 0.1) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function computeValuationPercentile(item, allItems) {
  const sector = item.sector || 'Other';
  const peers = allItems.filter(d => d.sector === sector && d.pe != null && d.pe > 0 && d.pe < 999);
  if (peers.length < 2 || item.pe == null || item.pe <= 0 || item.pe >= 999) return null;
  const sorted = [...peers].sort((a, b) => a.pe - b.pe);
  const idx = sorted.findIndex(d => d.ticker === item.ticker);
  if (idx < 0) return null;
  return Math.round((idx / (sorted.length - 1)) * 100);
}

function computeEPSSurpriseProxy(item, allItems) {
  if (item.pe == null || item.pe <= 0 || item.pe >= 999) return null;
  if (item.netIncome == null || item.marketCap == null || item.marketCap <= 0) return null;

  const earningsYield = (item.netIncome / item.marketCap) * 100;

  const sector = item.sector || 'Other';
  const peers = allItems.filter(d =>
    d.sector === sector && d.pe != null && d.pe > 0 && d.pe < 999 && d.netIncome != null && d.marketCap != null && d.marketCap > 0
  );

  if (peers.length < 2) return null;

  const peerYields = peers.map(d => (d.netIncome / d.marketCap) * 100);
  const avgYield = peerYields.reduce((a, b) => a + b, 0) / peerYields.length;

  if (avgYield === 0) return null;

  const surprise = ((earningsYield - avgYield) / Math.abs(avgYield)) * 100;

  return Math.round(Math.max(-100, Math.min(100, surprise)));
}

function scoreColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#4ade80';
  if (score >= 45) return '#facc15';
  if (score >= 25) return '#f97316';
  return '#ef4444';
}

function surpriseColor(val) {
  if (val > 20) return '#22c55e';
  if (val > 0) return '#4ade80';
  if (val > -20) return '#facc15';
  return '#ef4444';
}

function formatScore(v) {
  return v != null ? v.toFixed(1) : '—';
}

const ML_INTERNAL_LAYOUT = {
  lg: [
    { i: 'header', x: 0, y: 0, w: 12, h: 1 },
    { i: 'main', x: 0, y: 1, w: 12, h: 4 },
    { i: 'charts', x: 0, y: 5, w: 12, h: 3 },
  ]
};

const MLExplorer = ({ flatData, onTickerSelect }) => {

  const { colors } = useTheme();
  const edd = useMarketData('equitiesDeepDive');
  const sectorETFs = Array.isArray(edd?.data?.sectorData) ? edd.data.sectorData : [];
  const factorData = Array.isArray(edd?.data?.factorData) ? edd.data.factorData : [];
  const eddIsLive = edd?.isLive || false;
  const eddLastUpdated = edd?.lastUpdated || null;
  const eddFetchLog = edd?.fetchLog || [];
  const eddError = edd?.error || null;
  const eddFetchedOn = edd?.fetchedOn || null;
  const eddIsCurrent = edd?.isCurrent || false;
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [sortBy, setSortBy] = useState('momentum');
  const [sortDir, setSortDir] = useState('desc');
  const [filterSector, setFilterSector] = useState('all');
  const [search, setSearch] = useState('');

  const enriched = useMemo(() => {
    return flatData.map(item => {
      const sectorMatch = sectorETFs.find(
        s => (s.name && item.sector && s.name.toLowerCase().replace(/[\s.]/g, '').includes(item.sector.toLowerCase().replace(/[\s.]/g, '')))
          || (item.sector === 'Technology' && (s.code === 'XLK' || s.name === 'Technology'))
          || (item.sector === 'Financials' && (s.code === 'XLF' || s.name === 'Financials'))
          || (item.sector === 'Healthcare' && (s.code === 'XLV' || s.name === 'Health Care'))
          || (item.sector === 'Energy' && (s.code === 'XLE' || s.name === 'Energy'))
          || (item.sector === 'Industrials' && (s.code === 'XLI' || s.name === 'Industrials'))
          || (item.sector === 'Consumer' && (s.code === 'XLY' || s.code === 'XLP'))
      );
      return {
        ...item,
        momentum: computeMomentumScore(item, flatData),
        valPct: computeValuationPercentile(item, flatData),
        epsSurprise: computeEPSSurpriseProxy(item, flatData),
        sectorPerf: sectorMatch?.changePct != null ? sectorMatch.changePct : null,
      };
    });
  }, [flatData, sectorETFs]);

  const sectors = useMemo(() => {
    const set = new Set(flatData.map(d => d.sector).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [flatData]);

  const sectorPerfMap = useMemo(() => {
    if (!sectorETFs.length) return {};
    const map = {};
    for (const etf of sectorETFs) {
      const name = etf.name || etf.code;
      if (name) map[name] = etf;
    }
    return map;
  }, [sectorETFs]);

  const sectorSummary = useMemo(() => {
    if (!sectorETFs.length) return null;
    return sectorETFs.map(s => ({
      name: s.name || s.code,
      code: s.code,
      changePct: s.changePct != null ? s.changePct : null,
      price: s.price != null ? s.price : null,
    }));
  }, [sectorETFs]);

  const factorSummary = useMemo(() => {
    if (!factorData.length) return null;
    return factorData.slice(0, 10).map(f => ({
      ticker: f.ticker || f.code,
      name: f.name || f.ticker || f.code,
      sector: f.sector || '',
      changePct: f.changePct != null ? f.changePct : null,
    }));
  }, [factorData]);

  const filtered = useMemo(() => {
    let data = enriched;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(d =>
        d.ticker?.toLowerCase().includes(q) ||
        d.fullName?.toLowerCase().includes(q) ||
        d.sector?.toLowerCase().includes(q)
      );
    }
    if (filterSector !== 'all') {
      data = data.filter(d => d.sector === filterSector);
    }
    const dir = sortDir === 'desc' ? -1 : 1;
    const sortKey = sortBy;
    data = [...data].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const bv = b[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return data;
  }, [enriched, search, filterSector, sortBy, sortDir]);

  const avgStats = useMemo(() => {
    const items = enriched.filter(d => d.momentum != null);
    const valItems = enriched.filter(d => d.valPct != null);
    const epsItems = enriched.filter(d => d.epsSurprise != null);
    return {
      avgMomentum: items.length ? items.reduce((s, d) => s + d.momentum, 0) / items.length : null,
      avgValPct: valItems.length ? valItems.reduce((s, d) => s + d.valPct, 0) / valItems.length : null,
      avgEPS: epsItems.length ? epsItems.reduce((s, d) => s + d.epsSurprise, 0) / epsItems.length : null,
      countMomentum: items.length,
      countValPct: valItems.length,
      countEPS: epsItems.length,
    };
  }, [enriched]);

  const handleRowClick = useCallback((item) => {
    setSelectedTicker(item);
    setSummaryData(null);
  }, []);

  useEffect(() => {
    if (!selectedTicker) return;
    let cancelled = false;
    setIsLoadingDetail(true);
    const enc = encodeURIComponent(selectedTicker.ticker);
    fetch(apiUrl(`/api/summary/${enc}?region=${encodeURIComponent(selectedTicker.region || '')}`))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setSummaryData(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [selectedTicker]);

  const handleSort = useCallback((key) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  }, [sortBy]);

  const sortIndicator = (key) => {
    if (sortBy !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const sectorBarOption = useMemo(() => {
    if (!sectorSummary || sectorSummary.length === 0) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { left: '30%', right: '8%', top: '5%', bottom: '5%' },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: colors.border } },
        axisTick: { show: false },
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: sectorSummary.map(s => s.name?.replace('Consumer Disc.', 'Cons. Disc.').replace('Consumer Staples', 'Cons. Stap.')),
        axisLine: { lineStyle: { color: colors.border } },
        axisTick: { show: false },
        axisLabel: { color: colors.textMuted, fontSize: 9 },
      },
      series: [{
        type: 'bar',
        data: sectorSummary.map(s => ({
          value: s.changePct ?? 0,
          itemStyle: { color: s.changePct != null ? (s.changePct >= 0 ? '#4ade80' : '#f87171') : '#64748b' },
        })),
        barWidth: '60%',
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: params => {
          const d = params[0];
          return `<b>${d.name}</b><br/>Change: ${d.value != null ? `${d.value >= 0 ? '+' : ''}${d.value.toFixed(2)}%` : '—'}`;
        },
      },
    };
  }, [sectorSummary, colors]);

  const scatterOption = useMemo(() => {
    const data = enriched.filter(d => d.momentum != null && d.valPct != null);
    if (!data.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { left: '12%', right: '8%', top: '8%', bottom: '14%' },
      xAxis: {
        name: 'Momentum',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        type: 'value',
        min: 0, max: 100,
        axisLine: { lineStyle: { color: colors.border } },
        axisTick: { show: false },
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      yAxis: {
        name: 'Valuation %ile',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        type: 'value',
        min: 0, max: 100,
        axisLine: { lineStyle: { color: colors.border } },
        axisTick: { show: false },
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      series: [{
        type: 'scatter',
        data: data.map(d => ({
          value: [d.momentum, d.valPct],
          name: d.ticker,
          itemStyle: { color: SECTOR_COLORS[d.sector] || '#64748b' },
        })),
        symbolSize: 7,
        emphasis: {
          focus: 'series',
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
        },
      }],
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: p => `<b>${p.name}</b><br/>Momentum: ${p.value[0].toFixed(1)}<br/>Val %ile: ${p.value[1]}`,
      },
    };
  }, [enriched, colors]);

  const epsDetail = useMemo(() => {
    if (!summaryData?.earningsTrend?.trend) return null;
    return summaryData.earningsTrend.trend.slice(0, 4).map(t => {
      const actual = t.actualEPS;
      const est = t.earningsEstimate?.avg;
      const surprise = (actual != null && est != null && est !== 0)
        ? ((actual - est) / Math.abs(est)) * 100
        : null;
      return {
        period: t.period || '—',
        avgEst: est,
        lowEst: t.earningsEstimate?.low,
        highEst: t.earningsEstimate?.high,
        actual,
        surprise,
      };
    });
  }, [summaryData]);

  const financialDetail = useMemo(() => {
    const fd = summaryData?.financialData;
    const ks = summaryData?.defaultKeyStatistics;
    if (!fd && !ks) return null;
    return {
      revenue: fd?.totalRevenue,
      revenueGrowth: fd?.revenueGrowth,
      profitMargins: fd?.profitMargins,
      operatingMargins: fd?.operatingMargins,
      roe: fd?.returnOnEquity,
      roa: fd?.returnOnAssets,
      pe: ks?.forwardPE || ks?.trailingPE,
      pb: ks?.priceToBook,
      enterpriseToRevenue: ks?.enterpriseToRevenue,
      enterpriseToEbitda: ks?.enterpriseToEbitda,
      beta: ks?.beta,
      heldByInstitutions: ks?.heldPercentInstitutions,
    };
  }, [summaryData]);

  if (!flatData || flatData.length === 0) {
    return (
      <div className="ml-explorer ml-explorer--empty">
        <div className="ml-empty-state">
          <div className="ml-empty-state-icon">—</div>
          <p className="ml-empty-state-msg">No sector data available</p>
          <p className="ml-empty-state-hint">Fetch market data to populate the ML Explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eq-panel-content bento-panel-content ml-explorer">
      <div className="ml-toolbar">
        <input
          type="text"
          className="ml-search"
          placeholder="Search ticker or sector…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="ml-filter" value={filterSector} onChange={e => setFilterSector(e.target.value)}>
          {sectors.map(s => <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>)}
        </select>
      </div>


      <div className="ml-kpi-row">
        <div className="ml-kpi">
          <span className="ml-kpi-label">Avg Momentum</span>
          <span className="ml-kpi-value" style={{ color: scoreColor(avgStats.avgMomentum || 50) }}>
            {formatScore(avgStats.avgMomentum)}
          </span>
          <span className="ml-kpi-sub">{avgStats.countMomentum} stocks</span>
        </div>
        <div className="ml-kpi">
          <span className="ml-kpi-label">Avg Val Percentile</span>
          <span className="ml-kpi-value" style={{ color: colors.textSecondary }}>
            {avgStats.avgValPct != null ? `${avgStats.avgValPct.toFixed(0)}%ile` : '—'}
          </span>
          <span className="ml-kpi-sub">{avgStats.countValPct} stocks</span>
        </div>
        <div className="ml-kpi">
          <span className="ml-kpi-label">Avg EPS Proxy</span>
          <span className="ml-kpi-value" style={{ color: surpriseColor(avgStats.avgEPS || 0) }}>
            {avgStats.avgEPS != null ? `${avgStats.avgEPS > 0 ? '+' : ''}${avgStats.avgEPS.toFixed(1)}%` : '—'}
          </span>
          <span className="ml-kpi-sub">{avgStats.countEPS} stocks</span>
        </div>
      </div>

      {sectorSummary && sectorSummary.length > 0 && (
        <div className="ml-sector-strip">
          {sectorSummary.map(s => (
            <div key={s.code || s.name} className="ml-sector-pill" title={`${s.name}: ${s.changePct != null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '—'}`}>
              <span className="ml-sector-pill-name">{s.name?.replace('Consumer Disc.', 'CD').replace('Consumer Staples', 'CS').replace('Real Estate', 'RE').replace('Communication', 'Comm')}</span>
              <span className="ml-sector-pill-val" style={{ color: s.changePct != null ? (s.changePct >= 0 ? '#4ade80' : '#f87171') : '#64748b' }}>
                {s.changePct != null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(1)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="ml-body">
        <div className="ml-table-section">
          <table className="ml-table">
            <thead>
              <tr>
                <th className="ml-th-ml" onClick={() => handleSort('momentum')}>Momentum{sortIndicator('momentum')}</th>
                <th className="ml-th" onClick={() => handleSort('ticker')}>Ticker{sortIndicator('ticker')}</th>
                <th className="ml-th" onClick={() => handleSort('sector')}>Sector{sortIndicator('sector')}</th>
                <th className="ml-th-num" onClick={() => handleSort('valPct')}>Val %ile{sortIndicator('valPct')}</th>
                <th className="ml-th-num" onClick={() => handleSort('epsSurprise')}>EPS Proxy{sortIndicator('epsSurprise')}</th>
                <th className="ml-th-num" onClick={() => handleSort('marketCap')}>Mkt Cap{sortIndicator('marketCap')}</th>
                <th className="ml-th-num" onClick={() => handleSort('pe')}>P/E{sortIndicator('pe')}</th>
                <th className="ml-th-num" onClick={() => handleSort('changePct')}>Chg %{sortIndicator('changePct')}</th>
                {sectorSummary && sectorSummary.length > 0 && <th className="ml-th-num">Sector ETF</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 80).map(item => (
                <tr
                  key={item.ticker}
                  className={`ml-row${selectedTicker?.ticker === item.ticker ? ' ml-row-active' : ''}`}
                  onClick={() => handleRowClick(item)}
                >
                  <td>
                    <div className="ml-score-bar">
                      <div
                        className="ml-score-fill"
                        style={{ width: `${item.momentum}%`, backgroundColor: scoreColor(item.momentum) }}
                      />
                      <span className="ml-score-text">{formatScore(item.momentum)}</span>
                    </div>
                  </td>
                  <td className="ml-td-ticker">
                    <span className="ml-ticker-badge" style={{ backgroundColor: item.color }}>{item.ticker}</span>
                  </td>
                  <td>
                    <span className="ml-sector-chip" style={{
                      color: SECTOR_COLORS[item.sector] || '#64748b',
                      borderColor: `${SECTOR_COLORS[item.sector] || '#64748b'}55`,
                      background: `${SECTOR_COLORS[item.sector] || '#64748b'}18`,
                    }}>
                      {item.sector || '—'}
                    </span>
                  </td>
                  <td className="ml-td-num">
                    {item.valPct != null ? (
                      <span style={{ color: item.valPct < 30 ? '#22c55e' : item.valPct > 70 ? '#f97316' : colors.textSecondary }}>
                        {item.valPct}%ile
                      </span>
                    ) : '—'}
                  </td>
                  <td className="ml-td-num">
                    {item.epsSurprise != null ? (
                      <span style={{ color: surpriseColor(item.epsSurprise) }}>
                        {item.epsSurprise > 0 ? '+' : ''}{item.epsSurprise}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="ml-td-num">{item.marketCap != null ? `$${item.marketCap.toFixed(0)}B` : '—'}</td>
                  <td className="ml-td-num">{item.pe != null && item.pe < 999 ? `${item.pe.toFixed(1)}×` : '—'}</td>
                  <td className="ml-td-num" style={{ color: item.changePct != null ? (item.changePct >= 0 ? '#4ade80' : '#f87171') : undefined }}>
                    {item.changePct != null ? `${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}%` : '—'}
                  </td>
                  {sectorSummary && sectorSummary.length > 0 && (
                    <td className="ml-td-num" style={{ color: item.sectorPerf != null ? (item.sectorPerf >= 0 ? '#4ade80' : '#f87171') : undefined }}>
                      {item.sectorPerf != null ? `${item.sectorPerf >= 0 ? '+' : ''}${item.sectorPerf.toFixed(2)}%` : '—'}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={sectorSummary && sectorSummary.length > 0 ? 9 : 8} className="ml-empty">No equities match filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ml-detail-panel">
          {selectedTicker ? (
            <div className="ml-detail-content">
              <div className="ml-detail-header">
                <div>
                  <h3 className="ml-detail-ticker">
                    <span className="ml-ticker-badge-lg" style={{ backgroundColor: selectedTicker.color }}>
                      {selectedTicker.ticker}
                    </span>
                    {selectedTicker.fullName}
                  </h3>
                  <span className="ml-detail-sector" style={{
                    color: SECTOR_COLORS[selectedTicker.sector] || '#64748b',
                    borderColor: `${SECTOR_COLORS[selectedTicker.sector] || '#64748b'}55`,
                    background: `${SECTOR_COLORS[selectedTicker.sector] || '#64748b'}18`,
                  }}>
                    {selectedTicker.sector} · {selectedTicker.region}
                  </span>
                </div>
                <button className="ml-close-btn" onClick={() => setSelectedTicker(null)}>✕</button>
              </div>

              <div className="ml-scores-row">
                <div className="ml-score-card">
                  <div className="ml-score-card-label">Momentum</div>
                  <div className="ml-score-card-value" style={{ color: scoreColor(selectedTicker.momentum) }}>
                    {formatScore(selectedTicker.momentum)}
                  </div>
                  <div className="ml-score-bar-wide">
                    <div className="ml-score-fill-wide" style={{ width: `${selectedTicker.momentum}%`, backgroundColor: scoreColor(selectedTicker.momentum) }} />
                  </div>
                </div>
                <div className="ml-score-card">
                  <div className="ml-score-card-label">Valuation %ile</div>
                  <div className="ml-score-card-value" style={{ color: selectedTicker.valPct != null && selectedTicker.valPct < 30 ? '#22c55e' : selectedTicker.valPct > 70 ? '#f97316' : colors.textSecondary }}>
                    {selectedTicker.valPct != null ? `${selectedTicker.valPct}%ile` : '—'}
                  </div>
                  <div className="ml-score-bar-wide">
                    <div className="ml-score-fill-wide" style={{
                      width: `${selectedTicker.valPct ?? 50}%`,
                      backgroundColor: selectedTicker.valPct != null && selectedTicker.valPct < 30 ? '#22c55e' : selectedTicker.valPct > 70 ? '#f97316' : '#facc15',
                    }} />
                  </div>
                </div>
                <div className="ml-score-card">
                  <div className="ml-score-card-label">EPS Surprise Proxy</div>
                  <div className="ml-score-card-value" style={{ color: surpriseColor(selectedTicker.epsSurprise || 0) }}>
                    {selectedTicker.epsSurprise != null ? `${selectedTicker.epsSurprise > 0 ? '+' : ''}${selectedTicker.epsSurprise}%` : '—'}
                  </div>
                  <div className="ml-score-bar-wide">
                    <div className="ml-score-fill-wide" style={{
                      width: `${Math.max(5, Math.min(100, 50 + (selectedTicker.epsSurprise || 0)))}%`,
                      backgroundColor: surpriseColor(selectedTicker.epsSurprise || 0),
                    }} />
                  </div>
                </div>
              </div>

              {isLoadingDetail && <div className="ml-loading">Loading quoteSummary…</div>}

              {!isLoadingDetail && financialDetail && (
                <div className="ml-model-section">
                  <div className="ml-section-title">Valuation Model (quoteSummary)</div>
                  <div className="ml-fundamentals-grid">
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">Forward P/E</span>
                      <strong className="ml-fund-value">{financialDetail.pe != null ? `${financialDetail.pe.toFixed(2)}×` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">P/B</span>
                      <strong className="ml-fund-value">{financialDetail.pb != null ? `${financialDetail.pb.toFixed(2)}×` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">EV/Revenue</span>
                      <strong className="ml-fund-value">{financialDetail.enterpriseToRevenue != null ? `${financialDetail.enterpriseToRevenue.toFixed(2)}×` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">EV/EBITDA</span>
                      <strong className="ml-fund-value">{financialDetail.enterpriseToEbitda != null ? `${financialDetail.enterpriseToEbitda.toFixed(2)}×` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">ROE</span>
                      <strong className="ml-fund-value">{financialDetail.roe != null ? `${(financialDetail.roe * 100).toFixed(1)}%` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">ROA</span>
                      <strong className="ml-fund-value">{financialDetail.roa != null ? `${(financialDetail.roa * 100).toFixed(1)}%` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">Profit Margin</span>
                      <strong className="ml-fund-value">{financialDetail.profitMargins != null ? `${(financialDetail.profitMargins * 100).toFixed(1)}%` : '—'}</strong>
                    </div>
                    <div className="ml-fund-cell">
                      <span className="ml-fund-label">Op. Margin</span>
                      <strong className="ml-fund-value">{financialDetail.operatingMargins != null ? `${(financialDetail.operatingMargins * 100).toFixed(1)}%` : '—'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {!isLoadingDetail && epsDetail && epsDetail.length > 0 && (
                <div className="ml-model-section">
                  <div className="ml-section-title">EPS Surprise (quoteSummary)</div>
                  <table className="ml-eps-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Est. Avg</th>
                        <th>Actual</th>
                        <th>Surprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epsDetail.map(row => (
                        <tr key={row.period}>
                          <td>{row.period}</td>
                          <td>{row.avgEst != null ? `$${row.avgEst.toFixed(2)}` : '—'}</td>
                          <td>{row.actual != null ? `$${row.actual.toFixed(2)}` : '—'}</td>
                          <td style={{ color: row.surprise != null ? (row.surprise >= 0 ? '#4ade80' : '#f87171') : undefined }}>
                            {row.surprise != null ? `${row.surprise >= 0 ? '+' : ''}${row.surprise.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoadingDetail && !summaryData && (
                <div className="ml-no-data">Select a ticker to load quoteSummary data for EPS surprise and valuation details.</div>
              )}
            </div>
          ) : (
            <div className="ml-detail-empty">
              <div className="ml-empty-icon">♂</div>
              <p>Select a ticker to view ML features</p>
              <p className="ml-empty-hint">Momentum · Valuation Percentile · EPS Surprise</p>
            </div>
          )}
        </div>
      </div>

      <div className="ml-chart-section">
        {scatterOption && <SafeECharts option={scatterOption} style={{ height: '240px', width: '100%' }} />}
        {sectorBarOption && (
          <div style={{ marginTop: '0.5rem' }}>
            <div className="ml-section-title" style={{ padding: '0 0.5rem 0.25rem' }}>Sector ETF Performance</div>
            <SafeECharts option={sectorBarOption} style={{ height: sectorSummary.length > 0 ? `${Math.max(200, sectorSummary.length * 24)}px` : '200px', width: '100%' }} />
          </div>
        )}
        <DataFooter source="Yahoo Finance / Equity+ DataProvider" timestamp={eddLastUpdated} isLive={eddIsLive} fetchLog={eddFetchLog} error={eddError} fetchedOn={eddFetchedOn} isCurrent={eddIsCurrent} />
      </div>
    </div>
  );
};

export default MLExplorer;