import { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';

function fmtPct(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

function fmtPlainPct(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

function fmtUsd(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(0)}`;
}

function fmtTn(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (n >= 10) return `$${n.toFixed(1)}T`;
  if (n >= 1) return `$${n.toFixed(2)}T`;
  return `$${(n * 1000).toFixed(0)}B`;
}

function fmtPop(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(0)}M`;
}

function heatGrowth(v) {
  if (v == null) return 'var(--text-muted)';
  if (v >= 3) return '#4ade80';
  if (v >= 0) return '#86efac';
  if (v >= -1) return '#fbbf24';
  return '#f87171';
}

function heatInflation(v) {
  if (v == null) return 'var(--text-muted)';
  if (v <= 2) return '#4ade80';
  if (v <= 4) return '#fbbf24';
  return '#f87171';
}

export default function WorldBankMarketCapPanel() {
  const wbCtx = useMarketData('worldbank');
  const data = wbCtx?.data || {};
  const countries = Array.isArray(data.countries) ? data.countries : [];
  const isLive = !!(data.isLive || data._sources?.worldBankWdi || wbCtx?.isCurrent);

  const rows = useMemo(() => {
    // Real WDI rows only — drop empty shells
    const list = countries.filter(
      (c) =>
        c &&
        (c.mktCapUsd != null ||
          c.mktCapGdp != null ||
          c.gdpGrowth != null ||
          c.gdpPerCap != null ||
          c.inflation != null),
    );
    list.sort((a, b) => {
      const am = a.mktCapUsd ?? a.mktCapGdp ?? 0;
      const bm = b.mktCapUsd ?? b.mktCapGdp ?? 0;
      if (bm !== am) return bm - am;
      return (b.gdpPerCap || 0) - (a.gdpPerCap || 0);
    });
    return list;
  }, [countries]);

  const kpis = useMemo(() => {
    const withCap = rows.filter((c) => c.mktCapUsd != null);
    const totalCap = withCap.reduce((s, c) => s + (c.mktCapUsd || 0), 0);
    const growthVals = rows.map((c) => c.gdpGrowth).filter((v) => v != null && Number.isFinite(v));
    const cpiVals = rows.map((c) => c.inflation).filter((v) => v != null && Number.isFinite(v));
    const avgGrowth = growthVals.length
      ? growthVals.reduce((a, b) => a + b, 0) / growthVals.length
      : null;
    const avgCpi = cpiVals.length
      ? cpiVals.reduce((a, b) => a + b, 0) / cpiVals.length
      : null;
    const top = withCap[0] || rows[0] || null;
    // Year span from real observations
    const years = rows
      .flatMap((c) => [c.mktCapUsdYear, c.gdpGrowthYear, c.inflationYear])
      .filter(Boolean)
      .map(Number)
      .filter((y) => Number.isFinite(y));
    const yearMax = years.length ? Math.max(...years) : null;
    return {
      totalCap: withCap.length ? totalCap : null,
      avgGrowth,
      avgCpi,
      top,
      n: rows.length,
      withCap: withCap.length,
      yearMax,
    };
  }, [rows]);

  const maxCap = useMemo(
    () => Math.max(...rows.map((c) => c.mktCapUsd || 0), 0.01),
    [rows],
  );

  if (!rows.length) {
    return (
      <div className="wb-mcap-empty">
        World Bank WDI unavailable — no live observations returned.
        {wbCtx?.error ? ` (${wbCtx.error})` : ''}
      </div>
    );
  }

  return (
    <div className="wb-mcap-panel">
      <div className="wb-mcap-kpis">
        <div className="wb-mcap-kpi">
          <span className="wb-mcap-kpi-label">Listed mkt cap</span>
          <span className="wb-mcap-kpi-value" style={{ color: '#60a5fa' }}>
            {kpis.totalCap != null ? fmtTn(kpis.totalCap) : '—'}
          </span>
          <span className="wb-mcap-kpi-sub">
            {kpis.withCap}/{kpis.n} cos
            {kpis.yearMax ? ` · ${kpis.yearMax}` : ''}
          </span>
        </div>
        <div className="wb-mcap-kpi">
          <span className="wb-mcap-kpi-label">Avg GDP growth</span>
          <span className="wb-mcap-kpi-value" style={{ color: heatGrowth(kpis.avgGrowth) }}>
            {kpis.avgGrowth != null ? fmtPct(kpis.avgGrowth) : '—'}
          </span>
          <span className="wb-mcap-kpi-sub">mean · {kpis.n} cos</span>
        </div>
        <div className="wb-mcap-kpi">
          <span className="wb-mcap-kpi-label">Avg CPI</span>
          <span className="wb-mcap-kpi-value" style={{ color: heatInflation(kpis.avgCpi) }}>
            {kpis.avgCpi != null ? fmtPlainPct(kpis.avgCpi) : '—'}
          </span>
          <span className="wb-mcap-kpi-sub">inflation</span>
        </div>
        <div className="wb-mcap-kpi">
          <span className="wb-mcap-kpi-label">Largest market</span>
          <span className="wb-mcap-kpi-value" style={{ color: '#a78bfa' }}>
            {kpis.top ? `${kpis.top.flag || ''} ${kpis.top.code}` : '—'}
          </span>
          <span className="wb-mcap-kpi-sub">
            {kpis.top?.mktCapUsd != null
              ? fmtTn(kpis.top.mktCapUsd)
              : kpis.top?.gdpPerCap != null
                ? `${fmtUsd(kpis.top.gdpPerCap)} /cap`
                : '—'}
          </span>
        </div>
      </div>

      <div className="wb-mcap-table-wrap">
        <div className="wb-mcap-table-head" role="row">
          <span className="wb-col-flag" />
          <span className="wb-col-name">Country</span>
          <span className="wb-col-num">Mkt cap</span>
          <span className="wb-col-bar">vs max</span>
          <span className="wb-col-num">Cap/GDP</span>
          <span className="wb-col-num">Turnover</span>
          <span className="wb-col-num">GDP %</span>
          <span className="wb-col-num">CPI %</span>
          <span className="wb-col-num">GDP/cap</span>
          <span className="wb-col-num">Trade</span>
          <span className="wb-col-num">Pop</span>
        </div>
        <div className="wb-mcap-table-body" role="list" aria-label="Country market indicators">
          {rows.map((c) => {
            const capShare = c.mktCapUsd != null ? (c.mktCapUsd / maxCap) * 100 : 0;
            return (
              <div key={c.code} className="wb-mcap-table-row" role="listitem">
                <span className="wb-col-flag" title={c.name}>{c.flag || '·'}</span>
                <span className="wb-col-name" title={c.name}>
                  <strong>{c.code}</strong>
                  <span className="wb-col-name-full">{c.name}</span>
                </span>
                <span className="wb-col-num wb-col-cap" title={c.mktCapUsdYear ? `WDI ${c.mktCapUsdYear}` : undefined}>
                  {c.mktCapUsd != null ? fmtTn(c.mktCapUsd) : '—'}
                </span>
                <span className="wb-col-bar">
                  <span className="wb-bar-track">
                    <span className="wb-bar-fill" style={{ width: `${Math.min(100, Math.max(0, capShare))}%` }} />
                  </span>
                </span>
                <span className="wb-col-num">
                  {c.mktCapGdp != null ? fmtPlainPct(c.mktCapGdp, 0) : '—'}
                </span>
                <span className="wb-col-num wb-col-muted">
                  {c.mktTurnover != null ? fmtPlainPct(c.mktTurnover, 0) : '—'}
                </span>
                <span className="wb-col-num" style={{ color: heatGrowth(c.gdpGrowth), fontWeight: 600 }}>
                  {c.gdpGrowth != null ? fmtPct(c.gdpGrowth) : '—'}
                </span>
                <span className="wb-col-num" style={{ color: heatInflation(c.inflation) }}>
                  {c.inflation != null ? fmtPlainPct(c.inflation) : '—'}
                </span>
                <span className="wb-col-num">
                  {c.gdpPerCap != null ? fmtUsd(c.gdpPerCap) : '—'}
                </span>
                <span className="wb-col-num wb-col-muted">
                  {c.tradeGdp != null ? fmtPlainPct(c.tradeGdp, 0) : '—'}
                </span>
                <span className="wb-col-num wb-col-dim">
                  {c.population != null ? fmtPop(c.population) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="wb-mcap-footer">
        World Bank WDI (live) · {rows.length} economies
        {kpis.withCap ? ` · ${kpis.withCap} with listed mkt cap` : ''}
        {kpis.yearMax ? ` · latest obs ${kpis.yearMax}` : ''}
        {' · '}CM.MKT.LCAP · NY.GDP · FP.CPI · no mock data
        {isLive ? '' : ' · cache'}
      </div>
    </div>
  );
}
