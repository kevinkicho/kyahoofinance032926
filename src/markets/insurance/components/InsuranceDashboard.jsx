import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import { useMarketData } from '../../../hub/DataContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './InsuranceDashboard.css';

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

function InsuranceDashboard({
  catBondSpreads, combinedRatioData, reserveAdequacyData,
  reinsurancePricing, reinsurers, fredHyOasHistory,
  sectorETF, catBondProxy, industryAvgCombinedRatio, treasury10y,
  catLosses, combinedRatioHistory,
  isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent,
  currency, currentSymbol, convert,
}) {
  const { colors } = useTheme();

  const normalizedReserves = useMemo(() => {
    if (!reserveAdequacyData) return [];
    if (Array.isArray(reserveAdequacyData)) return reserveAdequacyData;
    const { lines = [], adequacy = [] } = reserveAdequacyData;
    return lines.map((name, idx) => ({
      insurer: name,
      ratio: adequacy[idx] != null ? adequacy[idx] / 100 : null,
    }));
  }, [reserveAdequacyData]);

  const hasReserves = normalizedReserves.length > 0;

  const normalizedSectorETF = useMemo(() => {
    if (!sectorETF) return [];
    if (Array.isArray(sectorETF)) return sectorETF;
    if (sectorETF.price != null || sectorETF.symbol) {
      return [{
        symbol: sectorETF.symbol || 'KIE',
        price: sectorETF.price,
        changePct: sectorETF.changePct ?? sectorETF.change ?? 0,
      }];
    }
    return [];
  }, [sectorETF]);

  const hasSectorETF = normalizedSectorETF.length > 0;

  // 2026-05-04: Catastrophe data (FEMA + USGS), insurance penetration
  // (World Bank), and EDGAR-derived insurer combined ratios.
  const femaCtx = useMarketData('fema');
  const usgsCtx = useMarketData('usgs');
  const wbCtx   = useMarketData('worldbank');
  const insRatiosCtx = useMarketData('edgarInsurerRatios');
  const ecbCtx = useMarketData('ecb');

  const hyOasOption = useMemo(() => {
    if (!fredHyOasHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: fredHyOasHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fredHyOasHistory.dates.length / 6) } },
      yAxis: { type: 'value', name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fredHyOasHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: 'rgba(245,158,11,0.1)' } }],
    };
  }, [fredHyOasHistory, colors]);

  const catLossesOption = useMemo(() => {
    if (!catLosses?.values?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: catLosses.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(catLosses.dates.length / 6) } },
      yAxis: { type: 'value', name: '$B', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'bar', data: catLosses.values, itemStyle: { color: '#ef4444' }, barMaxWidth: 20 }],
    };
  }, [catLosses, colors]);

  const combinedRatioOption = useMemo(() => {
    // Yahoo Finance's quoteSummary often returns empty quarterly statements
    // for insurers (rate-limit / paywall). Server pads quarters to length-8
    // with all-null values when that happens, so length>0 isn't enough —
    // require at least one numeric value before rendering the chart.
    if (!combinedRatioHistory?.values?.length) return null;
    if (!combinedRatioHistory.values.some(v => typeof v === 'number')) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: combinedRatioHistory.quarters, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', name: '%', min: 80, max: 110, nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: combinedRatioHistory.values, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#8b5cf6', width: 2 }, markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: colors.textDim }, data: [{ yAxis: 100, label: { position: 'end', formatter: '100%', fontSize: 9, color: colors.textMuted } }] } }],
    };
  }, [combinedRatioHistory, colors]);

  const kpis = useMemo(() => {
    const items = [];
    if (typeof industryAvgCombinedRatio === 'number') {
      items.push({
        label: 'Combined Ratio',
        value: `${industryAvgCombinedRatio}%`,
        color: industryAvgCombinedRatio > 100 ? '#f87171' : industryAvgCombinedRatio > 95 ? '#fbbf24' : '#4ade80',
        sublabel: industryAvgCombinedRatio > 100 ? 'Underwriting loss' : industryAvgCombinedRatio > 95 ? 'Marginal' : 'Profitable',
      });
    }
    // Server fetches reinsurers RNR / ACGL / AXS (not the P&C names PGR/ALL/
    // TRV/HIG that an earlier filter assumed). Render whatever the server
    // returns — the panel was silently empty when none matched.
    if (Array.isArray(reinsurers)) {
      reinsurers.slice(0, 4).forEach(r => {
        if (r?.price == null) return;
        const change = r.changePct;
        items.push({
          label: r.ticker,
          value: `${currentSymbol}${convert(r.price).toFixed(2)}`,
          color: change >= 0 ? '#4ade80' : '#f87171',
          trend: change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : null,
          sublabel: 'Reinsurer',
        });
      });
    }
    // FRED's BAMLH0A0HYM2 is reported in *percent* (e.g. 2.83 = 283 bps),
    // not basis points. Convert before display and threshold comparison —
    // otherwise "HY OAS" rendered as "3 bps" with always-green coloring.
    const hyOasPct = fredHyOasHistory?.values?.[fredHyOasHistory.values.length - 1];
    if (hyOasPct != null) {
      const hyOasBps = Math.round(hyOasPct * 100);
      items.push({
        label: 'HY OAS',
        value: `${hyOasBps} bps`,
        color: hyOasBps > 400 ? '#f87171' : hyOasBps > 300 ? '#fbbf24' : '#22c55e',
        sublabel: 'High Yield Spread',
      });
    }
    const firstEtf = normalizedSectorETF[0];
    if (firstEtf?.price != null) {
      const etfChange = firstEtf.changePct;
      items.push({
        label: `${firstEtf.symbol} ETF`,
        value: `$${Number(firstEtf.price).toFixed(2)}`,
        color: etfChange >= 0 ? '#4ade80' : '#f87171',
        trend: etfChange != null ? `${etfChange >= 0 ? '+' : ''}${Number(etfChange).toFixed(2)}%` : null,
        sublabel: 'Insurance Sector',
      });
    }
    return items;
  }, [industryAvgCombinedRatio, reinsurers, fredHyOasHistory, normalizedSectorETF, convert, currentSymbol]);

  // ── FEMA disaster type bar chart ───────────────────────────────────────
  const femaTypeOption = useMemo(() => {
    const rows = femaCtx?.data?.byType || [];
    if (!rows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 8, right: 12, bottom: 24, left: 110 },
      xAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'category', data: rows.map(r => r.type), inverse: true, axisLabel: { color: colors.textSecondary, fontSize: 10 } },
      series: [{
        type: 'bar', data: rows.map(r => r.count),
        itemStyle: { color: '#ef4444', borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: colors.textSecondary, fontSize: 9 },
      }],
    };
  }, [femaCtx, colors]);

  // ── World Bank insurance penetration — life vs non-life by country ────
  const wbInsuranceOption = useMemo(() => {
    const countries = (wbCtx?.data?.countries || []).filter(c => c.lifeInsPctGdp != null || c.nonLifeInsPctGdp != null);
    if (!countries.length) return null;
    const sorted = [...countries].sort((a, b) =>
      ((b.lifeInsPctGdp || 0) + (b.nonLifeInsPctGdp || 0)) -
      ((a.lifeInsPctGdp || 0) + (a.nonLifeInsPctGdp || 0))
    );
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v != null ? `${v.toFixed(2)}%` : '—' },
      legend: { data: ['Life premiums', 'Non-life premiums'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 12, bottom: 24, left: 36 },
      xAxis: { type: 'category', data: sorted.map(c => c.flag || c.code), axisLabel: { color: colors.textMuted, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%', color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'Life premiums', type: 'bar', stack: 'pen', data: sorted.map(c => c.lifeInsPctGdp), itemStyle: { color: '#3b82f6', borderRadius: [0, 0, 0, 0] } },
        { name: 'Non-life premiums', type: 'bar', stack: 'pen', data: sorted.map(c => c.nonLifeInsPctGdp), itemStyle: { color: '#f59e0b', borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, [wbCtx, colors]);

  // ── EDGAR-derived combined ratios — bar chart per issuer ───────────────
  const insurerRatiosOption = useMemo(() => {
    const issuers = insRatiosCtx?.data?.issuers || {};
    const rows = Object.entries(issuers)
      .filter(([, v]) => v?.latest)
      .map(([t, v]) => ({ ticker: t, ...v.latest }));
    if (!rows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => {
        const r = rows[ps[0]?.dataIndex];
        if (!r) return '';
        return `<b>${r.ticker}</b> · FY${r.fy} (${r.end})<br/>Combined: ${r.combinedPct?.toFixed(1)}%<br/>Loss: ${r.lossPct?.toFixed(1)}%<br/>Expense: ${r.expensePct?.toFixed(1)}%<br/>Premiums: $${r.premiumsB}B`;
      }},
      legend: { data: ['Loss', 'Expense'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 12, bottom: 24, left: 36 },
      xAxis: { type: 'category', data: rows.map(r => r.ticker), axisLabel: { color: colors.textSecondary, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%', color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } }, max: 110 },
      series: [
        { name: 'Loss', type: 'bar', stack: 'cr', data: rows.map(r => r.lossPct), itemStyle: { color: '#ef4444' } },
        { name: 'Expense', type: 'bar', stack: 'cr', data: rows.map(r => r.expensePct), itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, [insRatiosCtx, colors]);

  const layoutItems = [{ i: 'kpi', x: 0, y: 0, w: 12, h: 2 }];
  let x = 0;
  if (hyOasOption) { layoutItems.push({ i: 'hyoas', x, y: 2, w: 4, h: 3 }); x += 4; }
  if (catLossesOption) { layoutItems.push({ i: 'catloss', x, y: 2, w: 4, h: 3 }); x += 4; }
  if (combinedRatioOption) { layoutItems.push({ i: 'crhist', x, y: 2, w: 4, h: 3 }); }
  let x2 = 0;
  if (combinedRatioData?.lines?.length > 0 || combinedRatioData?.byLine?.length > 0) { layoutItems.push({ i: 'crline', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (reinsurancePricing?.byCategory?.length > 0 || (Array.isArray(reinsurancePricing) && reinsurancePricing.length > 0)) { layoutItems.push({ i: 'reinsrates', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (hasReserves) { layoutItems.push({ i: 'reserves', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (catBondSpreads?.length > 0) { layoutItems.push({ i: 'catbonds', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (hasSectorETF) { layoutItems.push({ i: 'etfs', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  // 2026-05-04 additions: catastrophes (FEMA + USGS), penetration (WB),
  // insurer combined ratios (EDGAR XBRL).
  if (femaCtx?.data?.declarations?.length || usgsCtx?.data?.events?.length) {
    layoutItems.push({ i: 'catastrophes', x: 0, y: 8, w: 8, h: 4 });
  }
  if (wbCtx?.data?.countries?.some(c => c.lifeInsPctGdp != null || c.nonLifeInsPctGdp != null)) {
    layoutItems.push({ i: 'ins-penetration', x: 8, y: 8, w: 4, h: 4 });
  }
  if (insRatiosCtx?.data?.issuers && Object.values(insRatiosCtx.data.issuers).some(v => v?.latest)) {
    layoutItems.push({ i: 'combined-ratios', x: 0, y: 12, w: 12, h: 3 });
  }
  if (femaCtx?.data?.summary || usgsCtx?.data?.biggest || catLosses?.values?.length) {
    layoutItems.push({ i: 'cat-exposure', x: 0, y: 15, w: 12, h: 3 });
  }
  // USGS mineral commodities panel
  if (usgsCtx?.data?.eventsCount > 0) {
    layoutItems.push({ i: 'usgs-minerals', x: 0, y: 18, w: 6, h: 3 });
  }
  if (ecbCtx?.data?.policyRates) {
    layoutItems.push({ i: 'ecb-supervisory', x: 6, y: 18, w: 6, h: 3 });
  }

  const dynamicLayout = { lg: layoutItems };

  const catExposure = useMemo(() => {
    const femaRecent = femaCtx?.data?.summary?.totalRecent;
    const quakeCount = usgsCtx?.data?.eventsCount;
    const biggestQuake = usgsCtx?.data?.biggest?.mag;
    const latestCatLoss = catLosses?.values?.at?.(-1);
    const hyOasPct = fredHyOasHistory?.values?.at?.(-1);
    const hyOasBps = typeof hyOasPct === 'number' ? hyOasPct * 100 : null;
    const combined = industryAvgCombinedRatio;
    const score = [
      typeof femaRecent === 'number' ? Math.min(25, femaRecent / 2) : 0,
      typeof biggestQuake === 'number' ? Math.max(0, (biggestQuake - 5) * 8) : 0,
      typeof latestCatLoss === 'number' ? Math.min(25, latestCatLoss / 4) : 0,
      typeof hyOasBps === 'number' ? Math.max(0, Math.min(15, (hyOasBps - 250) / 12)) : 0,
      typeof combined === 'number' ? Math.max(0, Math.min(20, (combined - 95) * 2)) : 0,
    ].reduce((sum, v) => sum + v, 0);
    const label = score >= 55 ? 'Elevated' : score >= 30 ? 'Watch' : 'Contained';
    return { femaRecent, quakeCount, biggestQuake, latestCatLoss, hyOasBps, combined, score, label };
  }, [femaCtx, usgsCtx, catLosses, fredHyOasHistory, industryAvgCombinedRatio]);

  return (
    <div className="ins-dashboard ins-dashboard--bento">
      <BentoWrapper layout={dynamicLayout} storageKey="insurance-layout-v5">
        {/* KPI Strip — bento card with title row drag handle. */}
        <BentoCard
          key="kpi"
          title="Insurance Key Metrics"
          accent="insurance"
          className="ins-bento-card ins-bento-kpi"
          noFooter
        >
          <MarketKpiStrip kpis={kpis} bare />
        </BentoCard>

        {/* HY OAS */}
        {hyOasOption && (
          <BentoCard
            key="hyoas"
            title="HY OAS Spread"
            accent="insurance"
            className="ins-bento-card"
            source="FRED / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={hyOasOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'HY OAS Spread', source: 'FRED', endpoint: '/api/insurance', series: [{ id: 'BAMLH0A0HYM2' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Cat Losses */}
        {catLossesOption && (
          <BentoCard
            key="catloss"
            title="Natural Catastrophe Losses"
            accent="insurance"
            className="ins-bento-card"
            source="FRED / Server"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={catLossesOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Natural Catastrophe Losses', source: 'FRED / Server', endpoint: '/api/insurance', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Combined Ratio History */}
        {combinedRatioOption && (
          <BentoCard
            key="crhist"
            title="Industry Combined Ratio"
            accent="insurance"
            className="ins-bento-card"
            source="FRED / A.M. Best"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={combinedRatioOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Industry Combined Ratio', source: 'FRED / A.M. Best', endpoint: '/api/insurance', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Combined Ratio by Line */}
        {(combinedRatioData?.lines?.length > 0 || combinedRatioData?.byLine?.length > 0) && (
          <BentoCard
            key="crline"
            title="Combined Ratio by Line"
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-scroll"
            source="FRED / NAIC"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {combinedRatioData.byLine.slice(0, 8).map((l) => (
                <div key={l.line} className="ins-mini-row">
                  <span className="ins-mini-name">{l.line}</span>
                  <span className="ins-mini-value" style={{ color: l.ratio > 100 ? '#f87171' : '#4ade80' }}>
                    <MetricValue value={l.ratio} seriesKey="insuranceCombinedRatioByLine" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Reinsurance Rates */}
        {reinsurancePricing?.byCategory?.length > 0 && (
          <BentoCard
            key="reinsrates"
            title="Reinsurance Rates"
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-scroll"
            source="FRED / Server"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {reinsurancePricing.byCategory.slice(0, 8).map((c, i) => {
                const name = c.category ?? c.peril ?? `row-${i}`;
                const rate = c.rate ?? c.rol;
                return (
                  <div key={name} className="ins-mini-row">
                    <span className="ins-mini-name">{name}</span>
                    <span className="ins-mini-value"><MetricValue value={rate} seriesKey="reinsuranceRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></span>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        )}

        {/* Reserve Adequacy */}
        {hasReserves && (
          <BentoCard
            key="reserves"
            title="Reserve Adequacy"
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-scroll"
            source="FRED / NAIC"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {normalizedReserves.slice(0, 8).map((r) => (
                <div key={r.insurer} className="ins-mini-row">
                  <span className="ins-mini-name">{r.insurer}</span>
                  <span className="ins-mini-value" style={{ color: r.ratio > 1.1 ? '#4ade80' : r.ratio < 1 ? '#f87171' : '#fbbf24' }}>
                    <MetricValue value={r.ratio} seriesKey="reserveAdequacy" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}x` : '—'} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Cat Bond Spreads */}
        {catBondSpreads?.length > 0 && (
          <BentoCard
            key="catbonds"
            title="Cat Bond Spreads"
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-scroll"
            source="FRED / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {catBondSpreads.slice(0, 8).map((b) => (
                <div key={b.name} className="ins-mini-row">
                  <span className="ins-mini-name">{b.name}</span>
                  <span className="ins-mini-value" style={{ color: b.spread > 8 ? '#4ade80' : '#fbbf24' }}>
                    <MetricValue value={b.spread} seriesKey="catBondSpread" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Sector ETFs */}
        {hasSectorETF && (
          <BentoCard
            key="etfs"
            title="Sector ETFs"
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-scroll"
            source="Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {normalizedSectorETF.slice(0, 8).map((e) => (
                <div key={e.symbol} className="ins-mini-row">
                  <span className="ins-mini-name">{e.symbol}</span>
                  <span className="ins-mini-value" style={{ color: (e.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                    <MetricValue value={e.changePct || 0} seriesKey="insuranceSectorEtf" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Recent US Catastrophes — FEMA disaster declarations + USGS quakes */}
        {(femaCtx?.data?.declarations?.length || usgsCtx?.data?.events?.length) && (
          <BentoCard
            key="catastrophes"
            title="Recent US Catastrophes"
            subtitle={femaCtx?.data?.summary
              ? `${femaCtx.data.summary.totalRecent} FEMA declarations · most-common: ${femaCtx.data.summary.mostCommonType} · ${usgsCtx?.data?.eventsCount || 0} M4.5+ quakes globally (30d)`
              : 'OpenFEMA disaster declarations + USGS earthquakes'}
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-scroll"
            source="OpenFEMA · USGS"
            timestamp={femaCtx?.lastUpdated || lastUpdated}
            isLive={!!(femaCtx?.data?.isLive || usgsCtx?.data?.isLive)}
            isCurrent={femaCtx?.isCurrent ?? isCurrent}
            fetchedOn={femaCtx?.fetchedOn || fetchedOn}
            fetchLog={femaCtx?.fetchLog || fetchLog}
            error={femaCtx?.error || error}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, height: '100%' }}>
              <div style={{ overflow: 'auto', minHeight: 0 }}>
                <div className="ins-panel-title" style={{ marginBottom: 4, fontSize: 11, color: colors.textMuted }}>FEMA Declarations</div>
                <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.cardBg}` }}>
                      <th style={{ textAlign: 'left', padding: '3px 6px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '3px 6px' }}>State(s)</th>
                      <th style={{ textAlign: 'left', padding: '3px 6px' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(femaCtx?.data?.declarations || []).slice(0, 10).map((d, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.cardBg}` }}>
                        <td style={{ padding: '3px 6px', color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{d.firstDeclared?.slice(0, 10)}</td>
                        <td style={{ padding: '3px 6px', color: colors.textPrimary || colors.textSecondary }}>
                          {d.stateCount > 3 ? `${d.states.slice(0, 2).join(',')} +${d.stateCount - 2}` : d.states.join(',')}
                        </td>
                        <td style={{ padding: '3px 6px', color: '#f87171' }}>{d.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="ins-panel-title" style={{ marginBottom: 4, fontSize: 11, color: colors.textMuted }}>By Incident Type</div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  {femaTypeOption && <SafeECharts option={femaTypeOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'FEMA Declarations by Type', source: 'OpenFEMA', endpoint: '/api/fema', series: [], updatedAt: femaCtx?.lastUpdated || lastUpdated }} />}
                </div>
              </div>
              <div style={{ overflow: 'auto', minHeight: 0 }}>
                <div className="ins-panel-title" style={{ marginBottom: 4, fontSize: 11, color: colors.textMuted }}>USGS M4.5+ Quakes (30d)</div>
                {usgsCtx?.data?.biggest && (
                  <div style={{ marginBottom: 6, padding: 6, background: colors.cardBg, borderRadius: 4, fontSize: 10 }}>
                    <div style={{ color: colors.textMuted }}>Largest:</div>
                    <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>M{usgsCtx.data.biggest.mag.toFixed(1)}</div>
                    <div style={{ color: colors.textSecondary }}>{usgsCtx.data.biggest.place?.slice(0, 50)}</div>
                  </div>
                )}
                <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
                  <tbody>
                    {(usgsCtx?.data?.magBuckets || []).map((b, i) => (
                      <tr key={i}>
                        <td style={{ padding: '3px 6px', color: colors.textSecondary }}>{b.range}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: b.range.startsWith('7') ? '#ef4444' : b.range.startsWith('6') ? '#f59e0b' : colors.textPrimary }}>{b.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </BentoCard>
        )}

        {/* Insurance Penetration — Life + Non-life premium %GDP by country */}
        {wbInsuranceOption && (
          <BentoCard
            key="ins-penetration"
            title="Insurance Penetration"
            subtitle="Life + Non-life premium / GDP · World Bank GFDD (latest available)"
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-content"
            source="World Bank GFDD"
            timestamp={wbCtx?.lastUpdated || lastUpdated}
            isLive={!!wbCtx?.data?.countries?.length}
            isCurrent={wbCtx?.isCurrent ?? isCurrent}
            fetchedOn={wbCtx?.fetchedOn || fetchedOn}
            fetchLog={wbCtx?.fetchLog || fetchLog}
            error={wbCtx?.error || error}
          >
            <SafeECharts option={wbInsuranceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Insurance Penetration', source: 'World Bank GFDD', endpoint: '/api/worldbank', series: [{ id: 'GFDD.DI.09' }, { id: 'GFDD.DI.10' }], updatedAt: wbCtx?.lastUpdated || lastUpdated }} />
          </BentoCard>
        )}

        {/* US P&C insurer combined ratios — EDGAR XBRL derived */}
        {insurerRatiosOption && (
          <BentoCard
            key="combined-ratios"
            title="US P&C Insurer Combined Ratios"
            subtitle={insRatiosCtx?.data?.summary
              ? `Avg ${insRatiosCtx.data.summary.avgCombinedPct}% across ${insRatiosCtx.data.summary.issuersWithData} issuers · latest FY ${insRatiosCtx.data.summary.latestEnd}`
              : 'Loss ratio + expense ratio per issuer (latest fiscal year)'}
            accent="insurance"
            className="ins-bento-card"
            contentClassName="ins-panel-content"
            source="SEC EDGAR XBRL"
            timestamp={insRatiosCtx?.lastUpdated || lastUpdated}
            isLive={!!insRatiosCtx?.data?.isLive}
            isCurrent={insRatiosCtx?.isCurrent ?? isCurrent}
            fetchedOn={insRatiosCtx?.fetchedOn || fetchedOn}
            fetchLog={insRatiosCtx?.fetchLog || fetchLog}
            error={insRatiosCtx?.error || error}
          >
            <SafeECharts option={insurerRatiosOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'US P&C Combined Ratios', source: 'SEC EDGAR XBRL', endpoint: '/api/edgar/insurer-ratios', series: [], updatedAt: insRatiosCtx?.lastUpdated || lastUpdated }} />
          </BentoCard>
        )}

        <BentoCard
          key="cat-exposure"
          title="Catastrophe Exposure Monitor"
          subtitle={`${catExposure.label} risk · FEMA, USGS, insured-loss, spread, and underwriting signals`}
          accent="insurance"
          className="ins-bento-card"
          contentClassName="ins-panel-scroll"
          source="OpenFEMA / USGS / FRED / SEC EDGAR"
          timestamp={femaCtx?.lastUpdated || usgsCtx?.lastUpdated || lastUpdated}
          isLive={!!(femaCtx?.data?.isLive || usgsCtx?.data?.isLive || catLosses?.values?.length)}
          isCurrent={femaCtx?.isCurrent ?? isCurrent}
          fetchedOn={femaCtx?.fetchedOn || fetchedOn}
          fetchLog={femaCtx?.fetchLog || fetchLog}
          error={femaCtx?.error || error}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['Exposure Score', catExposure.score, catExposure.score >= 55 ? '#f87171' : catExposure.score >= 30 ? '#f59e0b' : '#22c55e', v => `${v.toFixed(0)}/100`],
              ['FEMA Recent', catExposure.femaRecent, '#ef4444', v => `${v}`],
              ['M4.5+ Quakes', catExposure.quakeCount, '#f59e0b', v => `${v}`],
              ['Largest Quake', catExposure.biggestQuake, catExposure.biggestQuake >= 6 ? '#f87171' : '#f59e0b', v => `M${v.toFixed(1)}`],
              ['Cat Loss', catExposure.latestCatLoss, '#a78bfa', v => `$${v.toFixed(1)}B`],
              ['Combined', catExposure.combined, catExposure.combined >= 100 ? '#f87171' : '#22c55e', v => `${v.toFixed(1)}%`],
            ].map(([label, value, color, format]) => (
              <div key={label} style={{ background: colors.cardBg, borderRadius: 6, padding: '8px 10px', minWidth: 0 }}>
                <div style={{ color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ color, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {typeof value === 'number' && Number.isFinite(value) ? format(value) : '—'}
                </div>
              </div>
            ))}
          </div>
        </BentoCard>

        {usgsCtx?.data?.eventsCount > 0 && (
          <BentoCard key="usgs-minerals" title="USGS Earthquake Activity (30d)" accent="insurance" className="ins-bento-card" contentClassName="ins-panel-scroll" source="USGS Earthquake Hazards Program" timestamp={usgsCtx?.lastUpdated || lastUpdated} isLive={!!usgsCtx?.data?.isLive} isCurrent={usgsCtx?.isCurrent ?? isCurrent} fetchedOn={usgsCtx?.fetchedOn || fetchedOn} fetchLog={usgsCtx?.fetchLog || fetchLog} error={usgsCtx?.error || error}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                {usgsCtx.data.magBuckets?.map(b => (
                  <div key={b.range} style={{ background: colors.cardBg, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: colors.textMuted }}>{b.range}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: b.range.startsWith('7') ? '#f87171' : b.range.startsWith('6') ? '#f59e0b' : '#22c55e' }}>{b.count}</div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {usgsCtx.data.events?.slice(0, 8).map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${colors.cardBg}`, fontSize: 11 }}>
                    <span style={{ color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{e.place}</span>
                    <span style={{ fontWeight: 600, color: (e.mag || 0) >= 6 ? '#f87171' : (e.mag || 0) >= 5 ? '#f59e0b' : '#22c55e', marginLeft: 8 }}>M{e.mag?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </BentoCard>
        )}

        {ecbCtx?.data?.policyRates && (
          <BentoCard key="ecb-supervisory" title="ECB Policy Rates" accent="insurance" className="ins-bento-card" contentClassName="ins-panel-scroll" source="ECB SDW" timestamp={ecbCtx?.lastUpdated || lastUpdated} isLive={!!ecbCtx?.data?.isLive} isCurrent={ecbCtx?.isCurrent ?? isCurrent} fetchedOn={ecbCtx?.fetchedOn || fetchedOn} fetchLog={ecbCtx?.fetchLog || fetchLog} error={ecbCtx?.error || error}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, height: '100%' }}>
              {[
                ['Main Refinancing', ecbCtx.data.policyRates.mainRefinancing?.value, '#42a5f5'],
                ['Deposit Facility', ecbCtx.data.policyRates.depositFacility?.value, '#66bb6a'],
                ['Marginal Lending', ecbCtx.data.policyRates.marginalLending?.value, '#ef5350'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: colors.cardBg, borderRadius: 6, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{value != null ? `${value.toFixed(2)}%` : '—'}</div>
                </div>
              ))}
            </div>
          </BentoCard>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(InsuranceDashboard);
