import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import SafeECharts from '../../../components/SafeECharts';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './InsuranceDashboard.css';

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
    // Preferred: structured rows from fundamentalsTimeSeries
    if (Array.isArray(reserveAdequacyData.rows) && reserveAdequacyData.rows.length) {
      return reserveAdequacyData.rows
        .filter((r) => r && (r.ratio != null || r.liabilitiesM != null))
        .map((r) => ({
          insurer: r.insurer || r.ticker || '—',
          ticker: r.ticker || null,
          ratio: r.ratio != null && Number.isFinite(Number(r.ratio)) ? Number(r.ratio) : null,
          surplusRatio: r.surplusRatio ?? null,
          liabilitiesM: r.liabilitiesM ?? r.reserves ?? null,
          equityM: r.equityM ?? r.required ?? null,
          assetsM: r.assetsM ?? null,
          investmentsM: r.investmentsM ?? null,
          asOf: r.asOf || null,
        }))
        .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
    }
    if (Array.isArray(reserveAdequacyData)) {
      return reserveAdequacyData.map((r) => ({
        insurer: r.insurer || r.name || '—',
        ratio: r.ratio != null ? Number(r.ratio) : null,
        liabilitiesM: r.liabilitiesM ?? null,
        equityM: r.equityM ?? null,
        assetsM: r.assetsM ?? null,
      }));
    }
    // Legacy parallel arrays: adequacy was stored as coverage % (135.5 → 1.355x)
    const { lines = [], adequacy = [], reserves = [], required = [] } = reserveAdequacyData;
    return lines.map((name, idx) => {
      const a = adequacy[idx];
      let ratio = null;
      if (a != null && Number.isFinite(Number(a))) {
        // Values like 111.1 meant %; values like 1.11 already multiples
        ratio = Number(a) > 10 ? Number(a) / 100 : Number(a);
      }
      return {
        insurer: name,
        ratio,
        liabilitiesM: reserves[idx] ?? null,
        equityM: required[idx] ?? null,
      };
    }).filter((r) => r.ratio != null || r.liabilitiesM != null);
  }, [reserveAdequacyData]);

  const hasReserves = normalizedReserves.length > 0;

  const normalizedSectorETF = useMemo(() => {
    if (!sectorETF) return [];
    // FRED sector pulse array (preferred) or legacy single object
    if (Array.isArray(sectorETF) && sectorETF.length) {
      return sectorETF
        .filter((e) => e && (e.symbol || e.ticker || e.seriesId) && e.price != null)
        .map((e) => ({
          symbol: e.symbol || e.seriesId || e.ticker,
          name: e.name || e.symbol || e.ticker,
          group: e.group || null,
          unit: e.unit || null,
          price: e.price,
          changePct: e.changePct ?? e.change ?? null,
          yoyPct: e.yoyPct ?? null,
          period: e.period || null,
          source: e.source || 'FRED',
        }));
    }
    if (sectorETF.price != null || sectorETF.symbol) {
      return [{
        symbol: sectorETF.symbol || 'SP500',
        name: sectorETF.name || sectorETF.symbol || 'S&P 500',
        group: null,
        unit: null,
        price: sectorETF.price,
        changePct: sectorETF.changePct ?? sectorETF.change ?? null,
        yoyPct: null,
        period: null,
        source: sectorETF._source || 'FRED',
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

  // Prefer server catLosses; else build a FEMA proxy series so the panel is not stuck on "loading"
  const catLossesResolved = useMemo(() => {
    if (catLosses?.values?.length) return catLosses;
    const decls = femaCtx?.data?.declarations;
    if (Array.isArray(decls) && decls.length) {
      const byYear = {};
      for (const d of decls) {
        const y = String(d.declarationDate || d.firstDeclared || d.incidentBegin || d.date || '').slice(0, 4);
        if (/^\d{4}$/.test(y)) byYear[y] = (byYear[y] || 0) + 1;
      }
      const years = Object.keys(byYear).sort();
      if (years.length) {
        return {
          dates: years,
          values: years.map((y) => byYear[y]),
          seriesId: 'FEMA_DECL_COUNT',
          unit: 'declarations',
          _note: 'Proxy: FEMA declaration counts by year',
        };
      }
    }
    const byType = femaCtx?.data?.byType;
    if (Array.isArray(byType) && byType.length) {
      return {
        dates: byType.map((r) => r.type),
        values: byType.map((r) => Number(r.count) || 0),
        seriesId: 'FEMA_BY_TYPE',
        unit: 'declarations',
        _note: 'Proxy: FEMA declaration counts by type',
      };
    }
    return null;
  }, [catLosses, femaCtx?.data]);

  const catLossesOption = useMemo(() => {
    if (!catLossesResolved?.values?.length) return null;
    const unit = catLossesResolved.unit === 'declarations' ? 'count' : '$B';
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: catLossesResolved.dates,
        axisLabel: {
          color: colors.textMuted,
          fontSize: 9,
          interval: Math.max(0, Math.floor((catLossesResolved.dates?.length || 1) / 6)),
          rotate: catLossesResolved.seriesId === 'FEMA_BY_TYPE' ? 30 : 0,
        },
      },
      yAxis: {
        type: 'value',
        name: unit,
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{ type: 'bar', data: catLossesResolved.values, itemStyle: { color: '#ef4444' }, barMaxWidth: 20 }],
    };
  }, [catLossesResolved, colors]);

  // combinedRatioData.lines is { Progressive: [89,88,…], … } — not byLine[]
  const crLineRows = useMemo(() => {
    if (Array.isArray(combinedRatioData?.byLine) && combinedRatioData.byLine.length) {
      return combinedRatioData.byLine.filter((r) => r?.ratio != null);
    }
    const lines = combinedRatioData?.lines;
    if (!lines || typeof lines !== 'object') return [];
    const rows = [];
    for (const [line, arr] of Object.entries(lines)) {
      if (!Array.isArray(arr)) continue;
      let ratio = null;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null && Number.isFinite(Number(arr[i]))) {
          ratio = Number(arr[i]);
          break;
        }
      }
      if (ratio != null) rows.push({ line, ratio });
    }
    return rows.sort((a, b) => b.ratio - a.ratio);
  }, [combinedRatioData]);

  // reinsurancePricing is an array of equity proxies; legacy shape used byCategory
  const reinsRateRows = useMemo(() => {
    if (Array.isArray(reinsurancePricing?.byCategory) && reinsurancePricing.byCategory.length) {
      return reinsurancePricing.byCategory;
    }
    if (Array.isArray(reinsurancePricing) && reinsurancePricing.length) {
      return reinsurancePricing;
    }
    if (Array.isArray(reinsurers) && reinsurers.length) {
      return reinsurers.filter((r) => r?.price != null);
    }
    return [];
  }, [reinsurancePricing, reinsurers]);

  const combinedRatioOption = useMemo(() => {
    // Yahoo Finance's quoteSummary often returns empty quarterly statements
    // for insurers (rate-limit / paywall). Server pads quarters to length-8
    // with all-null values when that happens, so length>0 isn't enough —
    // require at least one numeric value before rendering the chart.
    if (!combinedRatioHistory?.values?.length) return null;
    const vals = combinedRatioHistory.values.filter(
      (v) => typeof v === 'number' && Number.isFinite(v),
    );
    if (!vals.length) return null;

    // Fixed min:80/max:110 clipped live data (~70–90). Scale to the series
    // with padding, and include the 100% break-even line when nearby.
    const dataMin = Math.min(...vals);
    const dataMax = Math.max(...vals);
    const pad = Math.max(2, (dataMax - dataMin) * 0.2 || 5);
    let yMin = dataMin - pad;
    let yMax = dataMax + pad;
    if (dataMax < 100 && 100 - dataMax <= 30) yMax = Math.max(yMax, 100);
    if (dataMin > 100 && dataMin - 100 <= 30) yMin = Math.min(yMin, 100);
    // Nice 5-pt ticks
    yMin = Math.floor(yMin / 5) * 5;
    yMax = Math.ceil(yMax / 5) * 5;
    if (yMax - yMin < 10) {
      yMin -= 5;
      yMax += 5;
    }

    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p || p.value == null) return '';
          const v = Number(p.value);
          const profit = v < 100 ? 'underwriting profit' : v > 100 ? 'underwriting loss' : 'break-even';
          return `${p.axisValue}<br/><b>${v.toFixed(1)}%</b> · ${profit}`;
        },
      },
      grid: { top: 20, right: 36, bottom: 28, left: 46 },
      xAxis: {
        type: 'category',
        data: combinedRatioHistory.quarters,
        axisLabel: { color: colors.textMuted, fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        name: 'CR %',
        min: yMin,
        max: yMax,
        scale: false,
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: {
          color: colors.textMuted,
          fontSize: 9,
          formatter: (v) => `${v}%`,
        },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: combinedRatioHistory.values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: colors.textDim, width: 1 },
          data: [{
            yAxis: 100,
            label: {
              position: 'insideEndTop',
              formatter: '100% BE',
              fontSize: 9,
              color: colors.textMuted,
            },
          }],
        },
      }],
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
    const spx = normalizedSectorETF.find((e) => e.symbol === 'SP500') || normalizedSectorETF[0];
    if (spx?.price != null) {
      const etfChange = spx.changePct;
      items.push({
        label: spx.name || 'S&P 500',
        value: Number(spx.price).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        color: etfChange == null ? undefined : etfChange >= 0 ? '#4ade80' : '#f87171',
        trend: etfChange != null ? `${etfChange >= 0 ? '+' : ''}${Number(etfChange).toFixed(2)}%` : null,
        sublabel: 'FRED equity',
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
      yAxis: (() => {
        const totals = rows
          .map((r) => (Number(r.lossPct) || 0) + (Number(r.expensePct) || 0))
          .filter((v) => Number.isFinite(v));
        const hi = totals.length ? Math.max(...totals, 100) : 110;
        const yMax = Math.ceil((hi + 5) / 5) * 5;
        return {
          type: 'value',
          min: 0,
          max: yMax,
          axisLabel: { formatter: '{value}%', color: colors.textMuted, fontSize: 9 },
          splitLine: { lineStyle: { color: colors.cardBg } },
        };
      })(),
      series: [
        { name: 'Loss', type: 'bar', stack: 'cr', data: rows.map(r => r.lossPct), itemStyle: { color: '#ef4444' } },
        { name: 'Expense', type: 'bar', stack: 'cr', data: rows.map(r => r.expensePct), itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, [insRatiosCtx, colors]);

  // Always mount MARKET_PANELS slots (empty-state friendly) so splash/DOM
  // audits and users see every expected insurance panel — not only when
  // upstream data already arrived.
  const layoutItems = [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
    { i: 'hyoas', x: 0, y: 2, w: 4, h: 3 },
    { i: 'catloss', x: 4, y: 2, w: 4, h: 3 },
    { i: 'crhist', x: 8, y: 2, w: 4, h: 3 },
    { i: 'crline', x: 0, y: 5, w: 4, h: 3 },
    { i: 'reinsrates', x: 4, y: 5, w: 4, h: 3 },
    { i: 'reserves', x: 8, y: 5, w: 4, h: 5 },
    { i: 'catbonds', x: 0, y: 8, w: 4, h: 5 },
    { i: 'etfs', x: 4, y: 8, w: 4, h: 5 },
    { i: 'catastrophes', x: 8, y: 8, w: 4, h: 4 },
    { i: 'ins-penetration', x: 0, y: 13, w: 4, h: 4 },
    { i: 'wb-ins-penetration', x: 4, y: 13, w: 4, h: 4 },
    { i: 'combined-ratios', x: 8, y: 13, w: 4, h: 4 },
    { i: 'fema-disasters', x: 0, y: 17, w: 6, h: 4 },
    { i: 'usgs-earthquakes', x: 6, y: 17, w: 6, h: 4 },
    { i: 'cat-exposure', x: 0, y: 21, w: 12, h: 5 },
    { i: 'usgs-minerals', x: 0, y: 26, w: 6, h: 4 },
    { i: 'ecb-supervisory', x: 6, y: 26, w: 6, h: 4 },
  ];

  const dynamicLayout = { lg: layoutItems };

  const catExposure = useMemo(() => {
    const fema = femaCtx?.data || {};
    const usgs = usgsCtx?.data || {};
    const femaRecent = fema.summary?.totalRecent;
    const mostCommonType = fema.summary?.mostCommonType || null;
    const newestDate = fema.summary?.newestDate
      ? String(fema.summary.newestDate).slice(0, 10)
      : null;
    const byType = Array.isArray(fema.byType) ? fema.byType.slice(0, 8) : [];
    const declarations = Array.isArray(fema.declarations) ? fema.declarations : [];

    // State concentration from recent declarations
    const stateCounts = {};
    for (const d of declarations) {
      for (const st of d.states || []) {
        stateCounts[st] = (stateCounts[st] || 0) + 1;
      }
    }
    const topStates = Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const openIncidents = declarations.filter((d) => !d.incidentEnd).length;
    const multiState = declarations.filter((d) => (d.stateCount || 0) > 1 || (d.states || []).length > 1).length;

    const quakeCount = usgs.eventsCount;
    const biggest = usgs.biggest || null;
    const biggestQuake = biggest?.mag ?? null;
    const magBuckets = Array.isArray(usgs.magBuckets) ? usgs.magBuckets : [];
    const events = Array.isArray(usgs.events) ? usgs.events : [];
    const m6plus = magBuckets
      .filter((b) => String(b.range || '').startsWith('6') || String(b.range || '').startsWith('7'))
      .reduce((s, b) => s + (b.count || 0), 0);
    const tsunamiFlags = events.filter((e) => e.tsunami).length;
    const deepQuakes = events.filter((e) => (e.depthKm || 0) >= 100).length;
    const recentQuakes = events.slice(0, 6);

    const catVals = catLosses?.values || [];
    const latestCatLoss = catVals.length ? catVals[catVals.length - 1] : null;
    const prevCatLoss = catVals.length > 1 ? catVals[catVals.length - 2] : null;
    const catLossChg =
      latestCatLoss != null && prevCatLoss != null && prevCatLoss !== 0
        ? ((latestCatLoss - prevCatLoss) / Math.abs(prevCatLoss)) * 100
        : null;

    const hyOasPct = fredHyOasHistory?.values?.at?.(-1);
    const hyOasBps = typeof hyOasPct === 'number' ? hyOasPct * 100 : null;
    const combined = industryAvgCombinedRatio;

    const score = [
      typeof femaRecent === 'number' ? Math.min(25, femaRecent / 2) : 0,
      typeof biggestQuake === 'number' ? Math.max(0, (biggestQuake - 5) * 8) : 0,
      typeof m6plus === 'number' ? Math.min(10, m6plus * 1.5) : 0,
      typeof latestCatLoss === 'number' ? Math.min(25, latestCatLoss / 4) : 0,
      typeof hyOasBps === 'number' ? Math.max(0, Math.min(15, (hyOasBps - 250) / 12)) : 0,
      typeof combined === 'number' ? Math.max(0, Math.min(20, (combined - 95) * 2)) : 0,
    ].reduce((sum, v) => sum + v, 0);
    const label = score >= 55 ? 'Elevated' : score >= 30 ? 'Watch' : 'Contained';
    const labelColor = score >= 55 ? '#f87171' : score >= 30 ? '#f59e0b' : '#22c55e';

    return {
      femaRecent,
      mostCommonType,
      newestDate,
      byType,
      topStates,
      openIncidents,
      multiState,
      recentDecls: declarations.slice(0, 6),
      quakeCount,
      biggestQuake,
      biggest,
      magBuckets,
      m6plus,
      tsunamiFlags,
      deepQuakes,
      recentQuakes,
      latestCatLoss,
      catLossChg,
      hyOasBps,
      combined,
      score,
      label,
      labelColor,
    };
  }, [femaCtx, usgsCtx, catLosses, fredHyOasHistory, industryAvgCombinedRatio]);

  // Compose independent panels via MarketPanelGrid bridge (__render).
  const panelBodies = {
        kpi: (
          <MarketKpiStrip kpis={kpis} bare />
        ),

        hyoas: (
          hyOasOption
            ? <SafeECharts option={hyOasOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'HY OAS Spread', source: 'FRED', endpoint: '/api/insurance', series: [{ id: 'BAMLH0A0HYM2' }], updatedAt: lastUpdated }} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>HY OAS series loading…</div>
        ),

        catloss: (
          catLossesOption
            ? <SafeECharts option={catLossesOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Natural Catastrophe Losses', source: catLossesResolved?.seriesId?.startsWith('FEMA') ? 'OpenFEMA' : 'FRED', endpoint: '/api/insurance', series: catLossesResolved?.seriesId ? [{ id: catLossesResolved.seriesId }] : [], updatedAt: lastUpdated }} />
            : null
        ),

        crhist: (
          combinedRatioOption
            ? <SafeECharts option={combinedRatioOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Industry Combined Ratio', source: 'FRED / A.M. Best', endpoint: '/api/insurance', series: [], updatedAt: lastUpdated }} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>Combined ratio history loading…</div>
        ),

        crline: (
          crLineRows.length > 0 ? (
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {crLineRows.slice(0, 8).map((l) => (
                <div key={l.line} className="ins-mini-row">
                  <span className="ins-mini-name">{l.line}</span>
                  <span className="ins-mini-value" style={{ color: l.ratio > 100 ? '#f87171' : '#4ade80' }}>
                    <MetricValue value={l.ratio} seriesKey="insuranceCombinedRatioByLine" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                  </span>
                </div>
              ))}
            </div>
          ) : null
        ),

        reinsrates: (
          reinsRateRows.length > 0 ? (
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {reinsRateRows.slice(0, 8).map((c, i) => {
                const name = c.ticker || c.category || c.peril || c.name || `row-${i}`;
                const price = c.price;
                const change = c.changePct ?? c.rate ?? c.rol;
                return (
                  <div key={name} className="ins-mini-row">
                    <span className="ins-mini-name">{name}</span>
                    <span className="ins-mini-value">
                      {price != null ? (
                        <MetricValue value={price} seriesKey="reinsuranceProxy" timestamp={lastUpdated} format={v => `$${Number(v).toFixed(2)}`} />
                      ) : '—'}
                      {change != null && (
                        <span style={{ marginLeft: 6, color: change >= 0 ? '#4ade80' : '#f87171', fontSize: 11 }}>
                          {change >= 0 ? '+' : ''}{Number(change).toFixed(2)}%
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null
        ),

        reserves: (
          hasReserves ? (
            <div className="reserve-panel">
              <div className="reserve-thead">
                <span>Insurer</span>
                <span className="num">Liab $M</span>
                <span className="num">Equity $M</span>
                <span className="num">Cover</span>
              </div>
              <div className="reserve-tbody">
                {normalizedReserves.map((r) => {
                  const cover = r.ratio;
                  const color =
                    cover == null
                      ? undefined
                      : cover >= 1.2
                        ? '#4ade80'
                        : cover >= 1.05
                          ? '#fbbf24'
                          : '#f87171';
                  const fmtM = (v) =>
                    v == null || !Number.isFinite(Number(v))
                      ? '—'
                      : Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
                  return (
                    <div key={r.ticker || r.insurer} className="reserve-row">
                      <span className="reserve-name">
                        <strong>{r.ticker || r.insurer}</strong>
                        {r.ticker && r.insurer !== r.ticker && (
                          <span className="reserve-sub">{r.insurer}</span>
                        )}
                      </span>
                      <span className="reserve-num muted">{fmtM(r.liabilitiesM)}</span>
                      <span className="reserve-num muted">{fmtM(r.equityM)}</span>
                      <span className="reserve-num" style={{ color }}>
                        <MetricValue
                          value={cover}
                          seriesKey="reserveAdequacy"
                          timestamp={r.asOf || lastUpdated}
                          format={(v) =>
                            v != null && Number.isFinite(Number(v))
                              ? `${Number(v).toFixed(2)}x`
                              : '—'
                          }
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="reserve-footer">
                Cover = total assets ÷ total liabilities · Yahoo quarterly BS · not statutory RBC
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
              Reserve adequacy data unavailable
            </div>
          )
        ),

        catbonds: (
          catBondSpreads?.length > 0 ? (
            <div className="catbond-panel">
              <div className="catbond-thead">
                <span>Series</span>
                <span className="num">Group</span>
                <span className="num">Level</span>
              </div>
              <div className="catbond-tbody">
                {catBondSpreads.map((b) => {
                  const unit = b.unit || (b.spreadBps != null ? 'bps' : 'pct');
                  const raw = b.spreadBps != null ? b.spreadBps : b.spread;
                  const isBps = unit === 'bps';
                  const isChg = unit === 'chg';
                  const color = isChg
                    ? (raw >= 0 ? '#4ade80' : '#f87171')
                    : isBps
                      ? (raw > 500 ? '#f87171' : raw > 200 ? '#fbbf24' : '#4ade80')
                      : (raw > 7 ? '#f87171' : raw > 5 ? '#fbbf24' : '#60a5fa');
                  const label = b.ticker ? `${b.ticker}` : b.name;
                  const sub = b.ticker ? b.name : (b.seriesId || b._note || '');
                  return (
                    <div key={`${b.name}-${b.ticker || b.seriesId || ''}`} className="catbond-row">
                      <span className="catbond-name">
                        <strong>{label}</strong>
                        {sub && sub !== label && <span className="catbond-sub" title={sub}>{sub}</span>}
                      </span>
                      <span className="catbond-group">{b.group || '—'}</span>
                      <span className="catbond-val" style={{ color }}>
                        <MetricValue
                          value={raw}
                          seriesKey="catBondSpread"
                          timestamp={lastUpdated}
                          format={(v) => {
                            if (v == null || !Number.isFinite(Number(v))) return '—';
                            const n = Number(v);
                            if (isBps) {
                              return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} bps`;
                            }
                            if (isChg) {
                              return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
                            }
                            return `${n.toFixed(2)}%`;
                          }}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="catbond-footer">
                Official FRED only · ICE BofA OAS · Treasury · Fed NFCI/VIX · no Yahoo · no mock OTC deals
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
              Cat bond / spread data unavailable
            </div>
          )
        ),

        etfs: (
          hasSectorETF ? (
            <div className="sector-etf-panel">
              <div className="sector-etf-thead">
                <span>Series</span>
                <span className="num">Level</span>
                <span className="num">Chg</span>
              </div>
              <div className="sector-etf-tbody">
                {normalizedSectorETF.map((e) => {
                  const chg = e.changePct;
                  const level = e.price;
                  let levelStr = '—';
                  if (level != null && Number.isFinite(Number(level))) {
                    const n = Number(level);
                    if (e.unit === '$M' || Math.abs(n) >= 1000) {
                      levelStr = n.toLocaleString('en-US', { maximumFractionDigits: 1 });
                    } else {
                      levelStr = n.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                    }
                    if (e.unit && e.unit !== 'idx' && e.unit !== 'k') {
                      /* unit shown in subtitle */
                    }
                  }
                  return (
                    <div key={e.symbol} className="sector-etf-row">
                      <span className="sector-etf-name">
                        <strong>{e.group ? `${e.group}` : e.symbol}</strong>
                        <span className="sector-etf-sub" title={`${e.name} · ${e.symbol}`}>
                          {e.name}
                          {e.period ? ` · ${String(e.period).slice(0, 10)}` : ''}
                        </span>
                      </span>
                      <span className="sector-etf-price" title={e.unit || ''}>
                        {levelStr}
                        {e.unit === 'idx' ? '' : e.unit === 'k' ? 'k' : e.unit === '$M' ? '' : ''}
                      </span>
                      <span
                        className="sector-etf-chg"
                        style={{
                          color:
                            chg == null
                              ? 'var(--text-muted)'
                              : chg >= 0
                                ? '#4ade80'
                                : '#f87171',
                        }}
                      >
                        {chg == null
                          ? '—'
                          : (
                            <MetricValue
                              value={chg}
                              seriesKey="insuranceSectorEtf"
                              timestamp={e.period || lastUpdated}
                              format={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`}
                            />
                          )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="sector-etf-footer">
                Official FRED streams only · not Yahoo sector ETFs · IP = Fed G.17 · PPI = BLS
              </div>
            </div>
          ) : (
            <div className="ins-empty" style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
              Sector / industry FRED data unavailable
            </div>
          )
        ),

        catastrophes: (
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
        ),

        'ins-penetration': (
          wbInsuranceOption
            ? <SafeECharts option={wbInsuranceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Insurance Penetration', source: 'World Bank GFDD', endpoint: '/api/worldbank', series: [{ id: 'GFDD.DI.09' }, { id: 'GFDD.DI.10' }], updatedAt: wbCtx?.lastUpdated || lastUpdated }} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>World Bank insurance penetration loading…</div>
        ),

        'wb-ins-penetration': (
          wbInsuranceOption
            ? <SafeECharts option={wbInsuranceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'WB Insurance Penetration', source: 'World Bank GFDD', endpoint: '/api/worldbank', series: [{ id: 'GFDD.DI.09' }, { id: 'GFDD.DI.10' }], updatedAt: wbCtx?.lastUpdated || lastUpdated }} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>World Bank GFDD series loading…</div>
        ),

        'combined-ratios': (
          insurerRatiosOption
            ? <SafeECharts option={insurerRatiosOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'US P&C Combined Ratios', source: 'SEC EDGAR XBRL', endpoint: '/api/edgar/insurer-ratios', series: [], updatedAt: insRatiosCtx?.lastUpdated || lastUpdated }} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>EDGAR insurer ratios loading…</div>
        ),

        'fema-disasters': (
          (femaCtx?.data?.declarations?.length > 0) ? (
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {femaCtx.data.declarations.slice(0, 10).map((d, i) => (
                <div key={i} className="ins-mini-row">
                  <span className="ins-mini-name">{d.firstDeclared?.slice(0, 10)} · {(d.states || []).slice(0, 2).join(',')}</span>
                  <span className="ins-mini-value" style={{ color: '#f87171' }}>{d.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>FEMA declarations loading…</div>
          )
        ),

        'usgs-earthquakes': (
          (usgsCtx?.data?.events?.length > 0 || usgsCtx?.data?.magBuckets?.length > 0) ? (
            <div className="ins-mini-table" style={{ paddingTop: 0 }}>
              {(usgsCtx?.data?.magBuckets || []).map((b, i) => (
                <div key={i} className="ins-mini-row">
                  <span className="ins-mini-name">{b.range}</span>
                  <span className="ins-mini-value">{b.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>USGS earthquake feed loading…</div>
          )
        ),

        'cat-exposure': (
          <div className="cat-exp-panel">
            {/* KPI score cards */}
            <div className="cat-exp-kpis">
              {[
                {
                  label: 'Exposure score',
                  value: catExposure.score,
                  color: catExposure.labelColor,
                  fmt: (v) => `${Number(v).toFixed(0)}/100`,
                  sub: catExposure.label,
                },
                {
                  label: 'FEMA recent',
                  value: catExposure.femaRecent,
                  color: '#ef4444',
                  fmt: (v) => Number(v).toLocaleString('en-US'),
                  sub: catExposure.mostCommonType
                    ? `top: ${catExposure.mostCommonType}`
                    : catExposure.newestDate || '',
                },
                {
                  label: 'Open incidents',
                  value: catExposure.openIncidents,
                  color: '#f97316',
                  fmt: (v) => Number(v).toLocaleString('en-US'),
                  sub: catExposure.multiState
                    ? `${catExposure.multiState} multi-state`
                    : 'active declarations',
                },
                {
                  label: 'M4.5+ quakes (30d)',
                  value: catExposure.quakeCount,
                  color: '#f59e0b',
                  fmt: (v) => Number(v).toLocaleString('en-US'),
                  sub: catExposure.m6plus != null ? `${catExposure.m6plus} ≥ M6` : '',
                },
                {
                  label: 'Largest quake',
                  value: catExposure.biggestQuake,
                  color: (catExposure.biggestQuake ?? 0) >= 6 ? '#f87171' : '#f59e0b',
                  fmt: (v) => `M${Number(v).toFixed(1)}`,
                  sub: catExposure.biggest?.place
                    ? String(catExposure.biggest.place).slice(0, 28)
                    : '',
                },
                {
                  label: 'Cat loss signal',
                  value: catExposure.latestCatLoss,
                  color: '#a78bfa',
                  fmt: (v) => `$${Number(v).toFixed(1)}B`,
                  sub:
                    catExposure.catLossChg != null
                      ? `${catExposure.catLossChg >= 0 ? '+' : ''}${catExposure.catLossChg.toFixed(1)}% vs prior`
                      : 'insured loss proxy',
                },
                {
                  label: 'HY OAS',
                  value: catExposure.hyOasBps,
                  color: (catExposure.hyOasBps ?? 0) > 400 ? '#f87171' : '#60a5fa',
                  fmt: (v) => `${Math.round(v)} bps`,
                  sub: 'credit stress',
                },
                {
                  label: 'Combined ratio',
                  value: catExposure.combined,
                  color: (catExposure.combined ?? 0) >= 100 ? '#f87171' : '#22c55e',
                  fmt: (v) => `${Number(v).toFixed(1)}%`,
                  sub: 'underwriting',
                },
              ].map((c) => (
                <div key={c.label} className="cat-exp-card">
                  <span className="cat-exp-card-label">{c.label}</span>
                  <span className="cat-exp-card-val" style={{ color: c.color }}>
                    {typeof c.value === 'number' && Number.isFinite(c.value) ? c.fmt(c.value) : '—'}
                  </span>
                  {c.sub ? <span className="cat-exp-card-sub" title={c.sub}>{c.sub}</span> : null}
                </div>
              ))}
            </div>

            <div className="cat-exp-body">
              {/* FEMA peril mix */}
              <div className="cat-exp-block">
                <div className="cat-exp-h">FEMA by peril</div>
                <div className="cat-exp-list">
                  {(catExposure.byType || []).length ? (
                    catExposure.byType.map((t) => {
                      const max = Math.max(...catExposure.byType.map((x) => x.count || 0), 1);
                      const pct = Math.round(((t.count || 0) / max) * 100);
                      return (
                        <div key={t.type} className="cat-exp-bar-row">
                          <span className="cat-exp-bar-name">{t.type}</span>
                          <span className="cat-exp-bar-track">
                            <span className="cat-exp-bar-fill" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="cat-exp-bar-n">{t.count}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="cat-exp-empty">No FEMA type breakdown</div>
                  )}
                </div>
              </div>

              {/* Top states */}
              <div className="cat-exp-block">
                <div className="cat-exp-h">Top states (FEMA)</div>
                <div className="cat-exp-chips">
                  {(catExposure.topStates || []).length ? (
                    catExposure.topStates.map((s) => (
                      <div key={s.state} className="cat-exp-chip">
                        <strong>{s.state}</strong>
                        <span>{s.count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="cat-exp-empty">No state tags</div>
                  )}
                </div>
                <div className="cat-exp-h" style={{ marginTop: 6 }}>USGS mag buckets</div>
                <div className="cat-exp-chips">
                  {(catExposure.magBuckets || []).map((b) => (
                    <div key={b.range} className="cat-exp-chip">
                      <strong>{b.range}</strong>
                      <span style={{
                        color: String(b.range).startsWith('7')
                          ? '#f87171'
                          : String(b.range).startsWith('6')
                            ? '#f59e0b'
                            : '#4ade80',
                      }}
                      >
                        {b.count}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="cat-exp-meta">
                  {catExposure.tsunamiFlags != null && (
                    <span>Tsunami flags: {catExposure.tsunamiFlags}</span>
                  )}
                  {catExposure.deepQuakes != null && (
                    <span>Depth ≥100 km: {catExposure.deepQuakes}</span>
                  )}
                </div>
              </div>

              {/* Recent declarations */}
              <div className="cat-exp-block">
                <div className="cat-exp-h">Recent FEMA declarations</div>
                <div className="cat-exp-table-wrap">
                  {(catExposure.recentDecls || []).length ? (
                    catExposure.recentDecls.map((d) => (
                      <div key={d.disasterNumber || d.title} className="cat-exp-tr">
                        <span className="cat-exp-tr-main">
                          <strong>{d.type || '—'}</strong>
                          <span className="cat-exp-tr-sub" title={d.title}>
                            {(d.states || []).join(',') || '—'} · {d.title || ''}
                          </span>
                        </span>
                        <span className="cat-exp-tr-date">
                          {d.firstDeclared ? String(d.firstDeclared).slice(0, 10) : '—'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="cat-exp-empty">No recent declarations</div>
                  )}
                </div>
              </div>

              {/* Recent quakes */}
              <div className="cat-exp-block">
                <div className="cat-exp-h">Recent quakes (USGS)</div>
                <div className="cat-exp-table-wrap">
                  {(catExposure.recentQuakes || []).length ? (
                    catExposure.recentQuakes.map((e) => (
                      <div key={e.id} className="cat-exp-tr">
                        <span className="cat-exp-tr-main">
                          <strong style={{
                            color: (e.mag || 0) >= 6 ? '#f87171' : (e.mag || 0) >= 5 ? '#f59e0b' : '#4ade80',
                          }}
                          >
                            M{e.mag != null ? Number(e.mag).toFixed(1) : '—'}
                          </strong>
                          <span className="cat-exp-tr-sub" title={e.place}>{e.place || '—'}</span>
                        </span>
                        <span className="cat-exp-tr-date">
                          {e.depthKm != null ? `${Number(e.depthKm).toFixed(0)} km` : '—'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="cat-exp-empty">No recent events</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ),

        'usgs-minerals': (
            <div className="usgs-eq-panel">
              <div className="usgs-eq-buckets">
                {(usgsCtx?.data?.magBuckets || []).map((b) => (
                  <div key={b.range} className="usgs-eq-bucket">
                    <span className="usgs-eq-bucket-r">{b.range}</span>
                    <span
                      className="usgs-eq-bucket-n"
                      style={{
                        color: String(b.range).startsWith('7')
                          ? '#f87171'
                          : String(b.range).startsWith('6')
                            ? '#f59e0b'
                            : '#22c55e',
                      }}
                    >
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="usgs-eq-table-wrap">
                <table className="usgs-eq-table">
                  <thead>
                    <tr>
                      <th>When (local)</th>
                      <th>UTC</th>
                      <th>Mag</th>
                      <th>Place</th>
                      <th>Depth</th>
                      <th>Lat / Lon</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Felt</th>
                      <th>Alert</th>
                      <th>Sig</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usgsCtx?.data?.events || []).slice(0, 20).map((e) => {
                      const ms = e.timeMs ?? (e.time ? Date.parse(e.time) : NaN);
                      const d = Number.isFinite(ms) ? new Date(ms) : null;
                      const localStr = d
                        ? d.toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short',
                          })
                        : '—';
                      const utcStr = d
                        ? d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
                        : (e.time ? String(e.time).replace('T', ' ').replace('Z', ' UTC') : '—');
                      const magColor =
                        (e.mag || 0) >= 7
                          ? '#f87171'
                          : (e.mag || 0) >= 6
                            ? '#fb923c'
                            : (e.mag || 0) >= 5
                              ? '#f59e0b'
                              : '#4ade80';
                      const alertColor = {
                        green: '#22c55e',
                        yellow: '#eab308',
                        orange: '#f97316',
                        red: '#ef4444',
                      }[String(e.alert || '').toLowerCase()] || 'var(--text-dim)';

                      return (
                        <tr key={e.id || `${e.time}-${e.place}`}>
                          <td className="usgs-eq-time" title={e.time || ''}>{localStr}</td>
                          <td className="usgs-eq-utc" title={e.time || ''}>{utcStr}</td>
                          <td className="usgs-eq-mag" style={{ color: magColor }}>
                            {e.mag != null ? `M${Number(e.mag).toFixed(1)}` : '—'}
                            {e.magType ? <span className="usgs-eq-magtype">{e.magType}</span> : null}
                          </td>
                          <td className="usgs-eq-place" title={e.place || e.title || ''}>
                            {e.place || e.title || '—'}
                            {e.tsunami ? <span className="usgs-eq-flag">Tsunami</span> : null}
                          </td>
                          <td className="num">
                            {e.depthKm != null ? `${Number(e.depthKm).toFixed(1)} km` : '—'}
                          </td>
                          <td className="num usgs-eq-ll">
                            {e.lat != null && e.lon != null
                              ? `${Number(e.lat).toFixed(2)}°, ${Number(e.lon).toFixed(2)}°`
                              : '—'}
                          </td>
                          <td>{e.type || 'earthquake'}</td>
                          <td>{e.status || '—'}</td>
                          <td className="num">
                            {e.felt != null
                              ? Number(e.felt).toLocaleString('en-US')
                              : '—'}
                            {e.cdi != null ? (
                              <span className="usgs-eq-sub"> CDI {Number(e.cdi).toFixed(1)}</span>
                            ) : null}
                            {e.mmi != null ? (
                              <span className="usgs-eq-sub"> MMI {Number(e.mmi).toFixed(1)}</span>
                            ) : null}
                          </td>
                          <td style={{ color: alertColor, fontWeight: 700, textTransform: 'capitalize' }}>
                            {e.alert || '—'}
                          </td>
                          <td className="num">{e.sig != null ? e.sig : '—'}</td>
                          <td>
                            {e.url ? (
                              <a
                                href={e.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="usgs-eq-link"
                                onMouseDown={(ev) => ev.stopPropagation()}
                              >
                                USGS
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="usgs-eq-footer">
                USGS GeoJSON M4.5+ month feed · times shown local + UTC · depth / lat-lon / felt / alert / significance from source
                {usgsCtx?.data?.metadata?.generated
                  ? ` · feed generated ${new Date(usgsCtx.data.metadata.generated).toLocaleString()}`
                  : ''}
              </div>
            </div>
        ),

        'ecb-supervisory': (
            (() => {
              const pr = ecbCtx?.data?.policyRates || {};
              const mm = ecbCtx?.data?.moneyMarket || {};
              const m3 = ecbCtx?.data?.m3Growth || [];
              const hicp = ecbCtx?.data?.hicpDetail || [];
              const m3Last = m3.length ? m3[m3.length - 1] : null;
              const hicpLast = hicp.length ? hicp[hicp.length - 1] : null;
              const fmt = (v, d = 2) =>
                v != null && Number.isFinite(Number(v)) ? `${Number(v).toFixed(d)}%` : '—';
              const chg = (v) => {
                if (v == null || !Number.isFinite(Number(v))) return null;
                const n = Number(v);
                return `${n > 0 ? '+' : ''}${n.toFixed(2)} pp`;
              };

              const policyCards = [
                {
                  code: 'DFR',
                  label: 'Deposit facility',
                  value: pr.depositFacility?.value,
                  period: pr.depositFacility?.period,
                  delta: pr.depositFacilityChange?.value,
                  color: '#66bb6a',
                  key: 'ecbDepositRate',
                  digits: 2,
                },
                {
                  code: 'MRR',
                  label: 'Main refinancing',
                  value: pr.mainRefinancing?.value,
                  period: pr.mainRefinancing?.period,
                  delta: pr.mainRefinancingChange?.value,
                  color: '#42a5f5',
                  key: 'ecbMainRefiRate',
                  digits: 2,
                },
                {
                  code: 'MLFR',
                  label: 'Marginal lending',
                  value: pr.marginalLending?.value,
                  period: pr.marginalLending?.period,
                  delta: pr.marginalLendingChange?.value,
                  color: '#ef5350',
                  key: 'ecbMarginalLending',
                  digits: 2,
                },
              ];

              const mmCards = [
                { code: '€STR', label: 'Vol-weighted overnight', value: mm.estr?.value, period: mm.estr?.period, color: '#a78bfa', key: 'ecbEstr', digits: 3 },
                { code: '€STR p25', label: '25th percentile', value: mm.estrP25?.value, period: mm.estrP25?.period, color: '#c4b5fd', digits: 3 },
                { code: '€STR p75', label: '75th percentile', value: mm.estrP75?.value, period: mm.estrP75?.period, color: '#c4b5fd', digits: 3 },
                { code: '€STR m-avg', label: 'Monthly average', value: mm.estrMonthlyAvg?.value, period: mm.estrMonthlyAvg?.period, color: '#a78bfa', digits: 3 },
                { code: 'E1M', label: 'EURIBOR 1-month', value: mm.euribor1m?.value, period: mm.euribor1m?.period, color: '#fbbf24', key: 'ecbEuribor1m', digits: 3 },
                { code: 'E3M', label: 'EURIBOR 3-month', value: mm.euribor3m?.value, period: mm.euribor3m?.period, color: '#fbbf24', key: 'ecbEuribor3m', digits: 3 },
                { code: 'E6M', label: 'EURIBOR 6-month', value: mm.euribor6m?.value, period: mm.euribor6m?.period, color: '#f59e0b', key: 'ecbEuribor6m', digits: 3 },
                { code: 'E1Y', label: 'EURIBOR 1-year', value: mm.euribor1y?.value, period: mm.euribor1y?.period, color: '#f59e0b', key: 'ecbEuribor1y', digits: 3 },
              ].filter((c) => c.value != null && Number.isFinite(Number(c.value)));

              const derivedCards = [
                { code: 'Corridor', label: 'MLFR − DFR', value: pr.corridorWidth?.value, period: pr.corridorWidth?.period, color: '#94a3b8', digits: 2 },
                { code: 'MRR−DFR', label: 'Standing facility spread', value: pr.standingFacilitySpread?.value, period: pr.standingFacilitySpread?.period, color: '#94a3b8', digits: 2 },
                {
                  code: '€STR−DFR',
                  label: 'Pass-through gap',
                  value:
                    mm.estr?.value != null && pr.depositFacility?.value != null
                      ? Number(mm.estr.value) - Number(pr.depositFacility.value)
                      : null,
                  period: mm.estr?.period,
                  color: '#38bdf8',
                  digits: 2,
                },
                {
                  code: 'E3M−MRR',
                  label: 'EURIBOR 3M − MRR',
                  value:
                    mm.euribor3m?.value != null && pr.mainRefinancing?.value != null
                      ? Number(mm.euribor3m.value) - Number(pr.mainRefinancing.value)
                      : null,
                  period: mm.euribor3m?.period,
                  color: '#38bdf8',
                  digits: 2,
                },
              ].filter((c) => c.value != null && Number.isFinite(Number(c.value)));

              const macroCards = [
                {
                  code: 'M3',
                  label: 'Money supply YoY',
                  value: m3Last?.value,
                  period: m3Last?.period,
                  color: '#22c55e',
                  key: 'ecbM3Growth',
                  digits: 1,
                },
                {
                  code: 'HICP',
                  label: 'Euro-area inflation YoY',
                  value: hicpLast?.value,
                  period: hicpLast?.period,
                  color: (hicpLast?.value ?? 0) > 3 ? '#f87171' : '#22c55e',
                  key: 'ecbHicp',
                  digits: 1,
                },
                {
                  code: '€STR vol',
                  label: '€STR turnover €m',
                  value: mm.estrVolume?.value,
                  period: mm.estrVolume?.period,
                  color: '#64748b',
                  digits: 0,
                  isLevel: true,
                },
                {
                  code: '€STR txn',
                  label: '€STR transactions',
                  value: mm.estrTransactions?.value,
                  period: mm.estrTransactions?.period,
                  color: '#64748b',
                  digits: 0,
                  isLevel: true,
                },
              ].filter((c) => c.value != null && Number.isFinite(Number(c.value)));

              const renderCard = (c) => (
                <div key={c.code + c.label} className="ins-ecb-card">
                  <span className="ins-ecb-code" style={{ color: c.color }}>{c.code}</span>
                  <span className="ins-ecb-val" style={{ color: c.color }}>
                    {c.key && !c.isLevel ? (
                      <MetricValue
                        value={c.value}
                        seriesKey={c.key}
                        timestamp={c.period}
                        format={(v) => fmt(v, c.digits ?? 2)}
                      />
                    ) : c.isLevel ? (
                      Number(c.value).toLocaleString('en-US', { maximumFractionDigits: c.digits ?? 0 })
                    ) : (
                      fmt(c.value, c.digits ?? 2)
                    )}
                  </span>
                  <span className="ins-ecb-lab">{c.label}</span>
                  <span className="ins-ecb-meta">
                    {c.period ? String(c.period) : ''}
                    {chg(c.delta) ? ` · ${chg(c.delta)}` : ''}
                  </span>
                </div>
              );

              return (
                <div className="ins-ecb-panel">
                  <div className="ins-ecb-sec">
                    <div className="ins-ecb-h">
                      Key ECB interest rates
                      {pr.mainRefinancing?.period && (
                        <span className="ins-ecb-h-sub">eff. {pr.mainRefinancing.period}</span>
                      )}
                    </div>
                    <div className="ins-ecb-grid ins-ecb-grid-3">
                      {policyCards.map(renderCard)}
                    </div>
                  </div>

                  {mmCards.length > 0 && (
                    <div className="ins-ecb-sec">
                      <div className="ins-ecb-h">€STR &amp; EURIBOR</div>
                      <div className="ins-ecb-grid ins-ecb-grid-4">
                        {mmCards.map(renderCard)}
                      </div>
                    </div>
                  )}

                  {derivedCards.length > 0 && (
                    <div className="ins-ecb-sec">
                      <div className="ins-ecb-h">Spreads / pass-through</div>
                      <div className="ins-ecb-grid ins-ecb-grid-4">
                        {derivedCards.map(renderCard)}
                      </div>
                    </div>
                  )}

                  {macroCards.length > 0 && (
                    <div className="ins-ecb-sec">
                      <div className="ins-ecb-h">Euro-area aggregates</div>
                      <div className="ins-ecb-grid ins-ecb-grid-4">
                        {macroCards.map(renderCard)}
                      </div>
                    </div>
                  )}

                  <div className="ins-ecb-footer">
                    Live ECB SDW only · DFR/MRR/MLFR · €STR · EURIBOR 1M–1Y · M3 · HICP · no mock
                  </div>
                </div>
              );
            })()
        ),
  };

  const panelCtx = {
    __render: (panelId) => panelBodies[panelId] ?? null,
    __live: {
      kpi: !!isLive,
      hyoas: !!isLive,
      catloss: !!isLive,
      crhist: !!isLive,
      crline: !!isLive,
      reinsrates: !!isLive,
      reserves: !!(isLive && hasReserves),
      catbonds: !!(isLive && catBondSpreads?.length),
      etfs: !!(isLive && hasSectorETF),
      catastrophes: !!(femaCtx?.data?.isLive || usgsCtx?.data?.isLive),
      'ins-penetration': !!wbCtx?.data?.countries?.length,
      'wb-ins-penetration': !!wbCtx?.data?.countries?.length,
      'combined-ratios': !!insRatiosCtx?.data?.isLive,
      'fema-disasters': !!femaCtx?.data?.isLive,
      'usgs-earthquakes': !!usgsCtx?.data?.isLive,
      'cat-exposure': !!(femaCtx?.data?.isLive || usgsCtx?.data?.isLive || catLosses?.values?.length),
      'usgs-minerals': !!usgsCtx?.data?.isLive,
      'ecb-supervisory': !!ecbCtx?.data?.isLive,
    },
    __subtitle: {
      catloss: catLossesResolved?._note || undefined,
      reinsrates: 'Reinsurer equity proxies (no free public treaty ROL feed)',
      reserves: `${normalizedReserves.length || 0} insurers · assets / liabilities coverage`,
      catbonds: `${catBondSpreads?.length || 0} series · FRED credit / Treasury / Fed stress (no Yahoo)`,
      etfs: `${normalizedSectorETF.length || 0} official series · Fed · BLS · BEA · Census (FRED)`,
      catastrophes: femaCtx?.data?.summary
        ? `${femaCtx.data.summary.totalRecent} FEMA declarations · most-common: ${femaCtx.data.summary.mostCommonType} · ${usgsCtx?.data?.eventsCount || 0} M4.5+ quakes globally (30d)`
        : 'OpenFEMA disaster declarations + USGS earthquakes',
      'ins-penetration': 'Life + Non-life premium / GDP · World Bank GFDD (latest available)',
      'combined-ratios': insRatiosCtx?.data?.summary
        ? `Avg ${insRatiosCtx.data.summary.avgCombinedPct}% across ${insRatiosCtx.data.summary.issuersWithData} issuers · latest FY ${insRatiosCtx.data.summary.latestEnd}`
        : 'Loss ratio + expense ratio per issuer (latest fiscal year)',
      'cat-exposure': `${catExposure.label} · FEMA declarations · USGS seismicity · credit & underwriting`,
      'usgs-minerals': `${usgsCtx?.data?.eventsCount ?? 0} M4.5+ events · feed + human-readable times`,
      'ecb-supervisory': 'Policy corridor · €STR · EURIBOR · M3 · HICP · ECB SDW',
    },
    __disabled: {
      catloss: !catLossesOption,
      crline: !crLineRows.length,
      reinsrates: !reinsRateRows.length,
    },
    __noFooter: {
      kpi: true,
    },
    __source: {
      hyoas: 'FRED / Yahoo Finance',
      catloss: catLossesResolved?.seriesId?.startsWith('FEMA') ? 'OpenFEMA' : 'FRED / Server',
      crhist: 'FRED / A.M. Best',
      crline: 'FRED / NAIC / EDGAR',
      reinsrates: 'Yahoo Finance',
      reserves: 'Yahoo Finance (balance sheet)',
      catbonds: 'FRED (ICE BofA / Treasury / Fed)',
      etfs: 'FRED (Fed / BLS / BEA / Census)',
      catastrophes: 'OpenFEMA · USGS',
      'ins-penetration': 'World Bank GFDD',
      'wb-ins-penetration': 'World Bank GFDD',
      'combined-ratios': 'SEC EDGAR XBRL',
      'fema-disasters': 'OpenFEMA',
      'usgs-earthquakes': 'USGS',
      'cat-exposure': 'OpenFEMA / USGS / FRED',
      'usgs-minerals': 'USGS Earthquake Hazards Program',
      'ecb-supervisory': 'ECB Statistical Data Warehouse',
    },
  };

  return (
    <div className="ins-dashboard ins-dashboard--bento">
      <MarketPanelGrid
        marketId="insurance"
        layout={dynamicLayout}
        storageKey="insurance-layout-v6"
        accent="insurance"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
    </div>
  );
}

export default React.memo(InsuranceDashboard);
