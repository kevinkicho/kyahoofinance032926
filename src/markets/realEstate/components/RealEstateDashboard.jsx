import React, { useMemo } from 'react';
import { safeSlice } from '../../../utils/panelGuards';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import SafeECharts from '../../../components/SafeECharts';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import MetricValue from '../../../components/MetricValue/MetricValue';
import BisPropertyPricePanel from './BisPropertyPricePanel';
import MetroCaseShillerPanel from './MetroCaseShillerPanel';
import HudAffordabilityPanel from './HudAffordabilityPanel';
import {
  HousingPanel as CensusHousingPanel,
  TradePanel as CensusTradePanel,
  TrendsHousingPanel as CensusTrendsHousingPanel,
  TrendsTradePanel as CensusTrendsTradePanel,
  HOUSING_KEYS as CENSUS_HOUSING_KEYS,
  ECO_KEYS as CENSUS_ECO_KEYS,
  useCensusData,
} from '../../census/components/CensusDashboard';
import RentalAffordabilityMap from './RentalAffordabilityMap';
import { latestNumber, fmtAcct, fmtUsdAcct, fmtPctAcct, getCommoditySnapshot } from './RealEstateHelpers';
import './RealEstateDashboard.css';

const LAYOUT = {
  lg: [
    { i: 'metrics', x: 0, y: 0, w: 3, h: 5 },
    { i: 'shiller', x: 3, y: 0, w: 3, h: 3 },
    { i: 'reitetf', x: 6, y: 0, w: 3, h: 3 },
    { i: 'reitperf', x: 9, y: 0, w: 3, h: 3 },
    { i: 'foreclosure', x: 3, y: 3, w: 3, h: 3 },
    { i: 'mba', x: 6, y: 3, w: 3, h: 3 },
    { i: 'cre', x: 9, y: 3, w: 3, h: 3 },
    { i: 'caprate', x: 0, y: 6, w: 3, h: 3 },
    { i: 'afford', x: 3, y: 6, w: 3, h: 3 },
    { i: 'supply', x: 6, y: 6, w: 3, h: 3 },
    { i: 'hud-afford', x: 9, y: 6, w: 3, h: 3 },
    { i: 'afford-stack', x: 0, y: 9, w: 12, h: 3 },
    // Taller grids so dense KPI cards fit (Housing & Construction / Trade & Consumption)
    { i: 'census-housing', x: 0, y: 12, w: 6, h: 5 },
    { i: 'census-trade', x: 6, y: 12, w: 6, h: 5 },
    { i: 'census-trends-housing', x: 0, y: 17, w: 6, h: 4 },
    { i: 'census-trends-trade', x: 6, y: 17, w: 6, h: 4 },
    { i: 'fhfa-hpi', x: 0, y: 21, w: 6, h: 3 },
    { i: 'bis-property-prices', x: 6, y: 21, w: 6, h: 5 },
    { i: 'metro-case-shiller', x: 0, y: 24, w: 6, h: 3 },
    { i: 'hud-affordability-by-metro', x: 6, y: 26, w: 6, h: 3 },
  ],
};

/** Last non-null point from {dates,values} or scalar. */
function seriesPoint(s) {
  if (s == null) return null;
  if (typeof s === 'number' && Number.isFinite(s)) return { value: s, date: null, prev: null };
  if (s.latest?.value != null) {
    return { value: Number(s.latest.value), date: s.latest.date || null, prev: s.previous?.value != null ? Number(s.previous.value) : null };
  }
  if (Array.isArray(s.values) && s.values.length) {
    for (let i = s.values.length - 1; i >= 0; i--) {
      if (s.values[i] != null && Number.isFinite(Number(s.values[i]))) {
        let prev = null;
        for (let j = i - 1; j >= 0; j--) {
          if (s.values[j] != null && Number.isFinite(Number(s.values[j]))) {
            prev = Number(s.values[j]);
            break;
          }
        }
        return { value: Number(s.values[i]), date: s.dates?.[i] || null, prev };
      }
    }
  }
  if (typeof s.value === 'number' && Number.isFinite(s.value)) {
    return { value: s.value, date: s.date || null, prev: null };
  }
  return null;
}

function momChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return { pct: ((curr - prev) / Math.abs(prev)) * 100, label: 'MoM' };
}

function card(key, label, pt, { format, unit, seriesKey, sublabel } = {}) {
  if (!pt || pt.value == null || !Number.isFinite(Number(pt.value))) return null;
  const change = momChange(pt.value, pt.prev);
  return {
    key,
    label,
    value: pt.value,
    date: pt.date,
    unit,
    format,
    seriesKey: seriesKey || key,
    change,
    changeClass: change ? (change.pct >= 0 ? 'positive' : 'negative') : undefined,
    sublabel: sublabel || (pt.date ? String(pt.date).slice(0, 10) : undefined),
  };
}

function RealEstateDashboard({
  priceIndexData, reitData, affordabilityData, capRateData, mortgageRates,
  caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y,
  housingStarts, existingHomeSales, rentalVacancy, medianHomePrice,
  foreclosureData, mbaApplications, creDelinquencies, commoditiesData, censusData,
  hudData, fhfaHpi, fetchLog, isLive, lastUpdated, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const [hudView, setHudView] = React.useState('chart');
  const censusSeries = censusData?.series || {};
  const { kpiData: censusKpiData, housingSeries: censusHousingSeries, ecoSeries: censusEcoSeries } = useCensusData(censusSeries);
  const hasCensusHousingKpi = censusKpiData.some(k => CENSUS_HOUSING_KEYS.includes(k.key));
  const hasCensusEcoKpi = censusKpiData.some(k => CENSUS_ECO_KEYS.includes(k.key));
  const hasCensusHousingTrends = censusHousingSeries.length > 0;
  const hasCensusEcoTrends = censusEcoSeries.length > 0;

  // Cross-market series for denser Housing / Trade KPI cards
  const beaCtx = useMarketData('bea');
  const censusTradeCtx = useMarketData('censusTrade');
  const macroCtx = useMarketData('globalMacro');

  const housingExtraCards = useMemo(() => {
    const fmtK = (v) => (v != null ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—');
    const fmtM = (v) => (v != null ? `${(Number(v) / 1e6).toFixed(2)}M` : '—');
    const fmtUsd = (v) => (v != null ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—');
    const fmtPct = (v) => (v != null ? `${Number(v).toFixed(1)}%` : '—');
    const fmtIdx = (v) => (v != null ? Number(v).toFixed(1) : '—');
    const fmtRate = (v) => (v != null ? `${Number(v).toFixed(2)}%` : '—');

    const starts =
      seriesPoint(housingStarts)
      || seriesPoint(supplyData?.housingStarts)
      || seriesPoint(censusSeries?.housingStarts);
    const permits =
      seriesPoint(supplyData?.permits)
      || seriesPoint(supplyData?.buildingPermits)
      || seriesPoint(censusSeries?.buildingPermits);
    const ehs = seriesPoint(existingHomeSales);
    // existing home sales often in absolute units (4e6) → show millions
    const ehsCard = ehs
      ? card('existingHomeSales', 'Existing Home Sales', ehs.value >= 1e5 ? { ...ehs, value: ehs.value / 1e6, prev: ehs.prev != null ? ehs.prev / 1e6 : null } : ehs, {
        format: (v) => `${Number(v).toFixed(2)}M`,
        seriesKey: 'existingHomeSales',
        unit: 'SAAR',
      })
      : null;
    const medPrice = seriesPoint(medianHomePrice);
    const csNat = seriesPoint(caseShillerData?.national) || seriesPoint(caseShillerData);
    const fhfa = fhfaHpi?.latest?.value != null
      ? { value: Number(fhfaHpi.latest.value), date: fhfaHpi.latest.date, prev: null }
      : seriesPoint(fhfaHpi);
    const rent = seriesPoint(rentCpi);
    const mbaPurch = seriesPoint(mbaApplications?.purchase);
    const mbaRefi = seriesPoint(mbaApplications?.refi);
    const fc = seriesPoint(foreclosureData?.foreclosures) || seriesPoint(foreclosureData?.delinquencies);
    const months = supplyData?.monthsSupply != null && typeof supplyData.monthsSupply === 'number'
      ? { value: supplyData.monthsSupply, date: null, prev: null }
      : seriesPoint(supplyData?.monthsSupply);
    const listings = seriesPoint(supplyData?.activeListings);

    return [
      card('housingStarts', 'Housing Starts', starts, { format: fmtK, unit: 'K', seriesKey: 'housingStarts' }),
      card('buildingPermits', 'Building Permits', permits, { format: fmtK, unit: 'K', seriesKey: 'buildingPermits' }),
      card('newHomeSales', 'New Home Sales', seriesPoint(censusSeries?.newHomeSales), {
        format: fmtK, unit: 'K', seriesKey: 'newHomeSales',
      }),
      card('constructionSpending', 'Construction $', seriesPoint(censusSeries?.constructionSpending), {
        format: (v) => `$${(Number(v) / 1000).toFixed(0)}B`,
        seriesKey: 'constructionSpending',
      }),
      ehsCard,
      card('medianHomePrice', 'Median Home Price', medPrice, { format: fmtUsd, seriesKey: 'medianHomePrice' }),
      card('caseShiller', 'Case-Shiller US', csNat, { format: fmtIdx, seriesKey: 'caseShiller' }),
      card('fhfaHpi', 'FHFA HPI', fhfa, { format: fmtIdx, seriesKey: 'fhfaHpi' }),
      card('mortgage30', '30Y Mortgage', mortgageRates?.rate30y != null ? { value: mortgageRates.rate30y, date: mortgageRates.asOf, prev: null } : null, {
        format: fmtRate, seriesKey: 'mortgage30y', sublabel: mortgageRates?.asOf || 'Freddie Mac',
      }),
      card('mortgage15', '15Y Mortgage', mortgageRates?.rate15y != null ? { value: mortgageRates.rate15y, date: mortgageRates.asOf, prev: null } : null, {
        format: fmtRate, seriesKey: 'mortgage15y', sublabel: mortgageRates?.asOf || 'Freddie Mac',
      }),
      card('rentalVacancy', 'Rental Vacancy', rentalVacancy != null ? { value: Number(rentalVacancy), date: null, prev: null } : null, {
        format: fmtPct, seriesKey: 'rentalVacancy',
      }),
      card('homeownership', 'Homeownership', homeownershipRate != null ? { value: Number(homeownershipRate), date: null, prev: null } : null, {
        format: fmtPct, seriesKey: 'homeownershipRate',
      }),
      card('rentCpi', 'Rent CPI', rent, { format: fmtIdx, seriesKey: 'rentCpi' }),
      card('monthsSupply', 'Months Supply', months, { format: (v) => Number(v).toFixed(1), unit: 'mo', seriesKey: 'monthsSupply' }),
      card('activeListings', 'Active Listings', listings, { format: fmtM, seriesKey: 'activeListings' }),
      card('mbaPurchase', 'MBA Purchase Idx', mbaPurch, { format: fmtK, seriesKey: 'mbaPurchase' }),
      card('mbaRefi', 'MBA Refi Idx', mbaRefi, { format: fmtK, seriesKey: 'mbaRefi' }),
      card('foreclosure', 'Foreclosure Rate', fc, { format: fmtPct, seriesKey: 'foreclosureRate' }),
      card('treasury10y', '10Y Treasury', treasury10y != null ? { value: Number(treasury10y), date: null, prev: null } : null, {
        format: fmtRate, seriesKey: 'treasury10y', sublabel: 'Funding benchmark',
      }),
    ].filter(Boolean);
  }, [
    housingStarts, supplyData, censusSeries, existingHomeSales, medianHomePrice,
    caseShillerData, fhfaHpi, rentCpi, mbaApplications, foreclosureData,
    mortgageRates, rentalVacancy, homeownershipRate, treasury10y,
  ]);

  const tradeExtraCards = useMemo(() => {
    const fmtRetail = (v) => (v != null ? `$${(Number(v) / 1000).toFixed(0)}B` : '—');
    const fmtM = (v) => (v != null ? `$${(Number(v) / 1000).toFixed(1)}B` : '—');
    const fmtPct = (v) => (v != null ? `${Number(v).toFixed(1)}%` : '—');
    const fmtIdx = (v) => (v != null ? Number(v).toFixed(1) : '—');
    const fmtBn = (v) => {
      if (v == null) return '—';
      const n = Number(v);
      // BEA personal income tables are often in millions → show $T
      if (Math.abs(n) > 1e6) return `$${(n / 1e6).toFixed(2)}T`;
      if (Math.abs(n) > 1e3) return `$${(n / 1e3).toFixed(1)}B`;
      return n.toLocaleString();
    };

    const bea = beaCtx?.data;
    const pickBea = (pred) => {
      const rows = Array.isArray(bea?.savingRate) ? bea.savingRate : [];
      // Prefer latest period matching description
      const hit = rows.find((r) => pred(r) && r.period && String(r.period).startsWith('202'));
      // Prefer most recent month for matching line
      const matches = rows.filter((r) => pred(r) && r.value != null);
      if (!matches.length) return null;
      matches.sort((a, b) => String(b.period).localeCompare(String(a.period)));
      return { value: Number(matches[0].value), date: matches[0].period, prev: matches[1] ? Number(matches[1].value) : null };
    };
    const pce = pickBea((r) => /personal consumption expenditures/i.test(r.desc || '') && r.unit === 'Level');
    const dpi = pickBea((r) => /Equals: Disposable personal income/i.test(r.desc || '') && r.unit === 'Level');
    const savingPct = pickBea((r) => /Personal saving as a percentage/i.test(r.desc || ''));
    const personalIncome = pickBea((r) => r.desc === 'Personal income' && r.unit === 'Level');
    const outlaysChg = pickBea((r) => /Personal outlays, current dollars/i.test(r.desc || '') && /Percent change/i.test(r.unit || ''));

    const ct = censusTradeCtx?.data;
    const ctSummary = ct?.summary || ct?.latest;
    const goodsExports = ctSummary?.exports ?? ctSummary?.totalExports ?? null;
    const goodsImports = ctSummary?.imports ?? ctSummary?.totalImports ?? null;
    const goodsBalance = ctSummary?.balance ?? ctSummary?.tradeBalance ?? null;

    const macro = macroCtx?.data;
    const tradeBal = seriesPoint(macro?.tradeBalance);
    const sentiment = seriesPoint(macro?.consumerSentiment);
    const industrial = seriesPoint(macro?.industrialProd);

    return [
      card('retailSales', 'Retail Sales', seriesPoint(censusSeries?.retailSales), {
        format: fmtRetail, seriesKey: 'retailSales', unit: 'SA',
      }),
      card('durableGoods', 'Durable Goods Orders', seriesPoint(censusSeries?.durableGoods), {
        format: fmtM, seriesKey: 'durableGoods',
      }),
      card('tradeBalance', 'Goods Trade Balance', seriesPoint(censusSeries?.tradeBalance) || tradeBal, {
        format: fmtM, seriesKey: 'tradeBalance',
      }),
      card('pce', 'Personal Consumption', pce, {
        format: fmtBn, seriesKey: 'beaPce', sublabel: pce?.date ? `BEA ${pce.date}` : 'BEA',
      }),
      card('dpi', 'Disposable Income', dpi, {
        format: fmtBn, seriesKey: 'beaDpi', sublabel: dpi?.date ? `BEA ${dpi.date}` : 'BEA',
      }),
      card('personalIncome', 'Personal Income', personalIncome, {
        format: fmtBn, seriesKey: 'beaPi', sublabel: personalIncome?.date ? `BEA ${personalIncome.date}` : 'BEA',
      }),
      card('savingRate', 'Personal Saving %', savingPct, {
        format: fmtPct, seriesKey: 'beaSavingRate', sublabel: 'of DPI',
      }),
      card('outlaysChg', 'Outlays MoM', outlaysChg, {
        format: fmtPct, seriesKey: 'beaOutlaysChg', sublabel: outlaysChg?.date || 'BEA',
      }),
      card('goodsExports', 'Goods Exports', goodsExports != null ? { value: Number(goodsExports), date: ct?.fetchedOn, prev: null } : null, {
        format: fmtBn, seriesKey: 'censusTradeExports', sublabel: 'Census Trade',
      }),
      card('goodsImports', 'Goods Imports', goodsImports != null ? { value: Number(goodsImports), date: ct?.fetchedOn, prev: null } : null, {
        format: fmtBn, seriesKey: 'censusTradeImports', sublabel: 'Census Trade',
      }),
      card('goodsBalance', 'Goods Balance', goodsBalance != null ? { value: Number(goodsBalance), date: ct?.fetchedOn, prev: null } : null, {
        format: fmtBn, seriesKey: 'censusTradeBalance', sublabel: 'Census Trade',
      }),
      card('consumerSentiment', 'Consumer Sentiment', sentiment, {
        format: fmtIdx, seriesKey: 'consumerSentiment', sublabel: 'U. Michigan / macro',
      }),
      card('industrialProd', 'Industrial Production', industrial, {
        format: fmtIdx, seriesKey: 'industrialProd', sublabel: 'Fed / macro',
      }),
      card('rentCpiTrade', 'Rent CPI', seriesPoint(rentCpi), {
        format: fmtIdx, seriesKey: 'rentCpi', sublabel: 'Housing services',
      }),
      card('mortgage30Trade', '30Y Mortgage', mortgageRates?.rate30y != null ? { value: mortgageRates.rate30y, date: mortgageRates.asOf, prev: null } : null, {
        format: (v) => `${Number(v).toFixed(2)}%`, seriesKey: 'mortgage30y', sublabel: 'Credit conditions',
      }),
    ].filter(Boolean);
  }, [censusSeries, beaCtx?.data, censusTradeCtx?.data, macroCtx?.data, rentCpi, mortgageRates]);

  const hudOption = useMemo(() => {
    if (!hudData || hudData.length === 0) return null;

    const sortedData = [...hudData]
      .map((d) => {
        let ratio = d.ratio ?? d.rentToIncome ?? null;
        if (ratio != null && Number(ratio) > 0 && Number(ratio) <= 1.5) ratio = Number(ratio) * 100;
        let homeValue = d.homeValue;
        if (homeValue == null && typeof d.medianHomeValue === 'number') homeValue = d.medianHomeValue;
        if (homeValue == null && Array.isArray(d.medianHomeValue?.values)) {
          homeValue = d.medianHomeValue.values[d.medianHomeValue.values.length - 1];
        }
        return {
          ...d,
          ratio: ratio != null && Number.isFinite(Number(ratio)) ? Number(ratio) : null,
          homeValue: homeValue != null ? Number(homeValue) : null,
          rent: d.rent != null ? Number(d.rent) : null,
          income: d.income != null ? Number(d.income) : null,
        };
      })
      .filter(d => d.ratio != null)
      .sort((a, b) => b.ratio - a.ratio);
    if (!sortedData.length) return null;

    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const idx = params[0].dataIndex;
          const d = sortedData[idx];
          const color = d.ratio > 40 ? '#ef4444' : d.ratio > 30 ? '#f59e0b' : '#10b981';
          return `
            <div style="font-weight: 600; font-size: 11px; margin-bottom: 4px; color: ${colors.textPrimary};">${d.city}</div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 10px;">
              <span style="color: ${colors.textMuted};">Rent-to-Income:</span>
              <span style="font-weight: 600; color: ${color};">${d.ratio.toFixed(1)}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 10px;">
              <span style="color: ${colors.textMuted};">2B FMR Rent:</span>
              <span style="color: ${colors.textSecondary};">$${d.rent?.toLocaleString()}/mo</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 10px;">
              <span style="color: ${colors.textMuted};">Median Income:</span>
              <span style="color: ${colors.textSecondary};">$${d.income?.toLocaleString()}/yr</span>
            </div>
          `;
        }
      },
      grid: { top: 15, right: 10, bottom: 60, left: 35 },
      xAxis: {
        type: 'category',
        data: sortedData.map(d => d.city),
        axisLabel: {
          color: colors.textMuted,
          fontSize: 8,
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: '%',
        nameTextStyle: { color: colors.textMuted, fontSize: 8 },
        axisLabel: { color: colors.textMuted, fontSize: 8 },
        splitLine: { lineStyle: { color: colors.cardBg } }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 25
        },
        {
          type: 'slider',
          start: 0,
          end: 25,
          height: 12,
          bottom: 5,
          textStyle: { color: colors.textMuted, fontSize: 8 }
        }
      ],
      series: [
        {
          type: 'bar',
          data: sortedData.map(d => {
            const val = d.ratio;
            let color = '#10b981';
            if (val > 40) color = '#ef4444';
            else if (val > 30) color = '#f59e0b';
            return {
              value: val,
              itemStyle: { color }
            };
          }),
          barMaxWidth: 12
        }
      ]
    };
  }, [hudData, colors]);

  const shillerOption = useMemo(() => {
    const d = caseShillerData?.national || caseShillerData;
    if (!d?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: d.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(d.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: d.values, smooth: true, symbol: 'none', lineStyle: { color: '#60a5fa', width: 2 }, areaStyle: { color: 'rgba(96,165,250,0.1)' } }],
    };
  }, [caseShillerData, colors]);

  const reitOption = useMemo(() => {
    if (!reitEtf?.history?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: reitEtf.history.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(reitEtf.history.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: reitEtf.history.closes, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 }, areaStyle: { color: 'rgba(20,184,166,0.1)' } }],
    };
  }, [reitEtf, colors]);

  const foreclosureOption = useMemo(() => {
    if (!foreclosureData?.foreclosures?.values?.length && !foreclosureData?.delinquencies?.values?.length) return null;
    const series = [];
    if (foreclosureData.foreclosures?.values?.length) series.push({ name: 'Foreclosure Rate', type: 'line', data: foreclosureData.foreclosures.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#ef4444' } });
    if (foreclosureData.delinquencies?.values?.length) series.push({ name: 'Delinquency Rate', type: 'line', data: foreclosureData.delinquencies.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#f59e0b' } });
    const dates = foreclosureData.foreclosures?.dates || foreclosureData.delinquencies?.dates || [];
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: series.map(s => s.name), top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 5) } },
      yAxis: { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series,
    };
  }, [foreclosureData, colors]);

  const mbaOption = useMemo(() => {
    if (!mbaApplications?.purchase?.values?.length) return null;
    const series = [{ name: 'Purchase', type: 'line', data: mbaApplications.purchase.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#3b82f6' } }];
    if (mbaApplications.refi?.values?.length) series.push({ name: 'Refi', type: 'line', data: mbaApplications.refi.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#10b981' } });
    const dates = mbaApplications.purchase.dates || [];
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: series.map(s => s.name), top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 5) } },
      yAxis: { type: 'value', name: 'Index', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series,
    };
  }, [mbaApplications, colors]);

  const creOption = useMemo(() => {
    if (!creDelinquencies?.values?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: creDelinquencies.dates, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'bar', data: creDelinquencies.values, itemStyle: { color: '#8b5cf6' }, barMaxWidth: 30 }],
    };
  }, [creDelinquencies, colors]);

  const shillerLatest = useMemo(() => {
    const v = caseShillerData?.national?.values || caseShillerData?.values;
    return v?.[v.length - 1];
  }, [caseShillerData]);
  const medianHomePriceLatest = latestNumber(medianHomePrice) ?? affordabilityData?.current?.medianPrice ?? null;
  const housingStartsLatest = latestNumber(housingStarts, ['starts', 'values']) ?? latestNumber(supplyData?.housingStarts);
  const existingHomeSalesLatest = latestNumber(existingHomeSales);
  const commoditySnapshot = getCommoditySnapshot(commoditiesData);
  const affordabilityStack = useMemo(() => {
    const price = medianHomePriceLatest;
    const rate = mortgageRates?.rate30y;
    const hudMedianIncome = Array.isArray(hudData) && hudData.length
      ? hudData.map(d => d.income).filter(v => typeof v === 'number').sort((a, b) => a - b)[Math.floor(hudData.filter(d => typeof d.income === 'number').length / 2)]
      : null;
    if (typeof price !== 'number' && typeof rate !== 'number' && typeof hudMedianIncome !== 'number') return null;
    const downPayment = typeof price === 'number' ? price * 0.2 : null;
    const principal = typeof price === 'number' ? price * 0.8 : null;
    const monthlyRate = typeof rate === 'number' ? rate / 100 / 12 : null;
    const payment = principal && monthlyRate
      ? principal * (monthlyRate * ((1 + monthlyRate) ** 360)) / (((1 + monthlyRate) ** 360) - 1)
      : null;
    const annualBurden = payment && hudMedianIncome ? (payment * 12 / hudMedianIncome) * 100 : null;
    const stressLabel = annualBurden == null
      ? 'Partial'
      : annualBurden >= 40
        ? 'Stretched'
        : annualBurden >= 30
          ? 'Tight'
          : 'Manageable';
    return { price, rate, payment, hudMedianIncome, annualBurden, downPayment, stressLabel };
  }, [medianHomePriceLatest, mortgageRates, hudData]);

  // Always mount MARKET_PANELS slots so cold/slow FRED does not hide ~15 panels.
  const dynamicLayout = LAYOUT;

  // Compose independent panels via MarketPanelGrid bridge (__render).
  const panelBodies = {
        metrics: (
          <div className="re-metrics-panel">
            {/* Home Prices */}
            {(typeof shillerLatest === 'number' || typeof medianHomePriceLatest === 'number') && (
              <div className="re-m-section">
                <div className="re-m-title">Home prices</div>
                <div className="re-m-table">
                  {typeof shillerLatest === 'number' && (
                    <div className="re-m-row">
                      <span className="re-m-name">Case-Shiller</span>
                      <span className="re-m-val" style={{ color: '#60a5fa' }}>
                        <MetricValue
                          value={shillerLatest}
                          seriesKey="caseShiller"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 1)}
                        />
                      </span>
                      <span className="re-m-unit">idx</span>
                    </div>
                  )}
                  {typeof medianHomePriceLatest === 'number' && (
                    <div className="re-m-row">
                      <span className="re-m-name">Median price</span>
                      <span className="re-m-val">
                        <MetricValue
                          value={medianHomePriceLatest}
                          seriesKey="medianHomePrice"
                          timestamp={lastUpdated}
                          format={(v) => fmtUsdAcct(v, 0)}
                        />
                      </span>
                      <span className="re-m-unit">USD</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mortgage Rates */}
            {mortgageRates && (typeof mortgageRates.rate30y === 'number' || typeof mortgageRates.rate15y === 'number') && (
              <div className="re-m-section">
                <div className="re-m-title">Mortgage rates</div>
                <div className="re-m-table">
                  {typeof mortgageRates.rate30y === 'number' && (
                    <div className="re-m-row">
                      <span className="re-m-name">30Y fixed</span>
                      <span
                        className="re-m-val"
                        style={{
                          color:
                            mortgageRates.rate30y > 7
                              ? '#f87171'
                              : mortgageRates.rate30y > 5
                                ? '#fbbf24'
                                : '#4ade80',
                        }}
                      >
                        <MetricValue
                          value={mortgageRates.rate30y}
                          seriesKey="mortgage30y"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 2)}
                        />
                      </span>
                      <span className="re-m-unit">%</span>
                    </div>
                  )}
                  {typeof mortgageRates.rate15y === 'number' && (
                    <div className="re-m-row">
                      <span className="re-m-name">15Y fixed</span>
                      <span className="re-m-val">
                        <MetricValue
                          value={mortgageRates.rate15y}
                          seriesKey="mortgage15y"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 2)}
                        />
                      </span>
                      <span className="re-m-unit">%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity */}
            <div className="re-m-section">
              <div className="re-m-title">Activity</div>
              <div className="re-m-table">
                {typeof housingStartsLatest === 'number' && (
                  <div className="re-m-row">
                    <span className="re-m-name">Housing starts</span>
                    <span className="re-m-val">
                      <MetricValue
                        value={housingStartsLatest}
                        seriesKey="housingStarts"
                        timestamp={lastUpdated}
                        format={(v) => {
                          // FRED HOUST is thousands of units (SAAR)
                          if (v == null || !Number.isFinite(Number(v))) return '—';
                          const units = Number(v) * 1000;
                          return fmtAcct(units, 0);
                        }}
                      />
                    </span>
                    <span className="re-m-unit">units</span>
                  </div>
                )}
                {typeof existingHomeSalesLatest === 'number' && (
                  <div className="re-m-row">
                    <span className="re-m-name">Existing sales</span>
                    <span className="re-m-val">
                      <MetricValue
                        value={existingHomeSalesLatest}
                        seriesKey="existingHomeSales"
                        timestamp={lastUpdated}
                        format={(v) => {
                          if (v == null || !Number.isFinite(Number(v))) return '—';
                          // Already full-unit SAAR (e.g. 4,090,000)
                          return fmtAcct(v, 0);
                        }}
                      />
                    </span>
                    <span className="re-m-unit">units</span>
                  </div>
                )}
                {typeof homeownershipRate === 'number' && (
                  <div className="re-m-row">
                    <span className="re-m-name">Homeownership</span>
                    <span className="re-m-val">
                      <MetricValue
                        value={homeownershipRate}
                        seriesKey="homeownershipRate"
                        timestamp={lastUpdated}
                        format={(v) => fmtAcct(v, 1)}
                      />
                    </span>
                    <span className="re-m-unit">%</span>
                  </div>
                )}
                {typeof rentalVacancy === 'number' && (
                  <div className="re-m-row">
                    <span className="re-m-name">Rental vacancy</span>
                    <span className="re-m-val">
                      <MetricValue
                        value={rentalVacancy}
                        seriesKey="rentalVacancy"
                        timestamp={lastUpdated}
                        format={(v) => fmtAcct(v, 1)}
                      />
                    </span>
                    <span className="re-m-unit">%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Distress */}
            {(foreclosureData?.foreclosures?.values?.length ||
              foreclosureData?.delinquencies?.values?.length ||
              creDelinquencies?.values?.length) && (
              <div className="re-m-section">
                <div className="re-m-title">Distress</div>
                <div className="re-m-table">
                  {foreclosureData?.foreclosures?.values?.length > 0 && (
                    <div className="re-m-row">
                      <span className="re-m-name">Foreclosure rate</span>
                      <span className="re-m-val" style={{ color: '#f87171' }}>
                        <MetricValue
                          value={foreclosureData.foreclosures.values[foreclosureData.foreclosures.values.length - 1]}
                          seriesKey="foreclosureRate"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 2)}
                        />
                      </span>
                      <span className="re-m-unit">%</span>
                    </div>
                  )}
                  {foreclosureData?.delinquencies?.values?.length > 0 && (
                    <div className="re-m-row">
                      <span className="re-m-name">Delinquency</span>
                      <span className="re-m-val" style={{ color: '#fbbf24' }}>
                        <MetricValue
                          value={foreclosureData.delinquencies.values[foreclosureData.delinquencies.values.length - 1]}
                          seriesKey="delinquencyRate"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 1)}
                        />
                      </span>
                      <span className="re-m-unit">%</span>
                    </div>
                  )}
                  {creDelinquencies?.values?.length > 0 && (
                    <div className="re-m-row">
                      <span className="re-m-name">CRE delinq</span>
                      <span className="re-m-val" style={{ color: '#8b5cf6' }}>
                        <MetricValue
                          value={creDelinquencies.values[creDelinquencies.values.length - 1]}
                          seriesKey="creDelinquencyRate"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 1)}
                        />
                      </span>
                      <span className="re-m-unit">%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commodities */}
            {commoditySnapshot && (
              <div className="re-m-section">
                <div className="re-m-title">Commodities</div>
                <div className="re-m-table">
                  {commoditySnapshot.goldPrice != null && (
                    <div className="re-m-row">
                      <span className="re-m-name">Gold</span>
                      <span className="re-m-val">
                        <MetricValue
                          value={commoditySnapshot.goldPrice}
                          seriesKey="goldPrice"
                          timestamp={lastUpdated}
                          format={(v) => fmtUsdAcct(v, 2)}
                        />
                      </span>
                      <span className="re-m-unit">/oz</span>
                    </div>
                  )}
                  {commoditySnapshot.wtiPrice != null && (
                    <div className="re-m-row">
                      <span className="re-m-name">WTI oil</span>
                      <span className="re-m-val">
                        <MetricValue
                          value={commoditySnapshot.wtiPrice}
                          seriesKey="wtiPrice"
                          timestamp={lastUpdated}
                          format={(v) => fmtUsdAcct(v, 2)}
                        />
                      </span>
                      <span className="re-m-unit">/bbl</span>
                    </div>
                  )}
                  {commoditySnapshot.natGasPrice != null && (
                    <div className="re-m-row">
                      <span className="re-m-name">Nat gas</span>
                      <span className="re-m-val">
                        <MetricValue
                          value={commoditySnapshot.natGasPrice}
                          seriesKey="natGasPrice"
                          timestamp={lastUpdated}
                          format={(v) => fmtUsdAcct(v, 3)}
                        />
                      </span>
                      <span className="re-m-unit">/mm</span>
                    </div>
                  )}
                  {typeof commoditySnapshot.goldOilRatio === 'number' && (
                    <div className="re-m-row">
                      <span className="re-m-name">Gold / oil</span>
                      <span className="re-m-val">
                        <MetricValue
                          value={commoditySnapshot.goldOilRatio}
                          seriesKey="goldOilRatio"
                          timestamp={lastUpdated}
                          format={(v) => fmtAcct(v, 2)}
                        />
                      </span>
                      <span className="re-m-unit">x</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ),

        'afford-stack': (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Median Home', affordabilityStack?.price, '#60a5fa', v => `$${(v / 1000).toFixed(0)}K`],
                ['30Y Mortgage', affordabilityStack?.rate, (affordabilityStack?.rate ?? 0) >= 7 ? '#f87171' : '#fbbf24', v => `${v.toFixed(2)}%`],
                ['Est. Payment', affordabilityStack?.payment, '#a78bfa', v => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`],
                ['Median Income', affordabilityStack?.hudMedianIncome, '#22c55e', v => `$${(v / 1000).toFixed(0)}K`],
                ['Payment Burden', affordabilityStack?.annualBurden, (affordabilityStack?.annualBurden ?? 0) >= 40 ? '#f87171' : (affordabilityStack?.annualBurden ?? 0) >= 30 ? '#f59e0b' : '#22c55e', v => `${v.toFixed(1)}%`],
              ].map(([label, value, color, format]) => (
                <div key={label} className="re-metric-card" style={{ minWidth: 0 }}>
                  <div className="re-metric-label">{label}</div>
                  <div className="re-metric-value" style={{ color, fontSize: 16 }}>
                    {typeof value === 'number' && Number.isFinite(value) ? format(value) : '—'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 11 }}>
              Estimate uses national median home price, 20% down, latest 30Y mortgage rate, and median income from HUD city sample.
            </div>
            </>
        ),

        shiller: (
            <SafeECharts option={shillerOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Case-Shiller Index', source: 'FRED', endpoint: '/api/realEstate', series: [{ id: 'CSUSHPISA' }], updatedAt: lastUpdated }} />
        ),

        reitetf: (
            <SafeECharts option={reitOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'REIT ETF (VNQ)', source: 'Yahoo Finance', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
        ),

        reitperf: (
            <div className="re-mini-table" style={{ paddingTop: 0 }}>
              {safeSlice(reitData, 0, 8).map((r, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{r.symbol}</span>
                  <span className="re-mini-value" style={{ color: (r.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                    <MetricValue value={r.changePct || 0} seriesKey="reitPerformance" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                  </span>
                </div>
              ))}
              {!Array.isArray(reitData) || reitData.length === 0 ? (
                <div className="re-mini-row" style={{ opacity: 0.7 }}>
                  <span className="re-mini-name">No REIT performance rows yet</span>
                </div>
              ) : null}
            </div>
        ),

        foreclosure: (
            <SafeECharts option={foreclosureOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Distress Indicators', source: 'FRED', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
        ),

        mba: (
            <SafeECharts option={mbaOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'MBA Applications', source: 'FRED', endpoint: '/api/realEstate', series: [{ id: 'MORTGAGE30US' }], updatedAt: lastUpdated }} />
        ),

        cre: (
            <SafeECharts option={creOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CRE Delinquencies', source: 'FRED', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
        ),

        caprate: (
            <div className="re-mini-table" style={{ paddingTop: 0 }}>
              {safeSlice(capRateData, 0, 8).map((c, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{c.sector}</span>
                  <span className="re-mini-value"><MetricValue value={c.impliedYieldPct ?? c.impliedYield ?? c.capRate} seriesKey="capRate" timestamp={lastUpdated} format={v => typeof v === 'number' ? `${v.toFixed(2)}%` : '—'} /></span>
                </div>
              ))}
              {!Array.isArray(capRateData) || capRateData.length === 0 ? (
                <div className="re-mini-row" style={{ opacity: 0.7 }}>
                  <span className="re-mini-name">No cap rate rows yet</span>
                </div>
              ) : null}
            </div>
        ),

        afford: (
            <div className="re-mini-table" style={{ paddingTop: 0 }}>
              {(() => {
                const cur = affordabilityData?.current;
                if (!cur) {
                  // Fallback: show history-derived rows
                  const hist = (affordabilityData?.history || []).slice(-8);
                  if (!hist.length) {
                    return (
                      <div className="re-mini-row" style={{ opacity: 0.7 }}>
                        <span className="re-mini-name">No affordability data yet</span>
                      </div>
                    );
                  }
                  return hist.map((h, i) => (
                    <div key={i} className="re-mini-row">
                      <span className="re-mini-name">{h.date?.slice(0, 7) || `Period ${i+1}`}</span>
                      <span className="re-mini-value" style={{ color: h.priceToIncome > 5 ? '#f87171' : h.priceToIncome > 3.5 ? '#fbbf24' : '#4ade80' }}>
                        <MetricValue value={h.priceToIncome} seriesKey="affordabilityIndex" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}x` : '—'} />
                      </span>
                    </div>
                  ));
                }
                const rows = [
                  { label: 'Median Price', value: cur.medianPrice, fmt: v => `$${(v / 1000).toFixed(0)}K`, color: '#60a5fa' },
                  { label: 'Median Income', value: cur.medianIncome, fmt: v => `$${(v / 1000).toFixed(0)}K`, color: '#22c55e' },
                  { label: 'Price/Income', value: cur.priceToIncome, fmt: v => `${v.toFixed(1)}x`, color: cur.priceToIncome > 5 ? '#f87171' : cur.priceToIncome > 3.5 ? '#fbbf24' : '#4ade80' },
                  { label: 'Mortgage/Income', value: cur.mortgageToIncome, fmt: v => `${v.toFixed(1)}%`, color: cur.mortgageToIncome > 30 ? '#f87171' : cur.mortgageToIncome > 20 ? '#fbbf24' : '#4ade80' },
                  { label: '30Y Rate', value: cur.rate30y, fmt: v => `${v.toFixed(2)}%`, color: '#fbbf24' },
                  { label: 'YoY Change', value: cur.yoyChange, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: cur.yoyChange >= 0 ? '#f87171' : '#4ade80' },
                ];
                return rows.map((r, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{r.label}</span>
                    <span className="re-mini-value" style={{ color: r.color }}>
                      <MetricValue value={r.value} seriesKey="affordabilityIndex" timestamp={lastUpdated} format={r.fmt} />
                    </span>
                  </div>
                ));
              })()}
            </div>
        ),

        supply: (
            <div className="re-mini-table" style={{ paddingTop: 0 }}>
              {(() => {
                const rows = [];
                const sd = supplyData || {};
                const startsVals = sd.housingStarts?.values || [];
                const permitsVals = sd.permits?.values || [];
                if (startsVals.length > 0) {
                  const latest = startsVals.at(-1);
                  const prev = startsVals.at(-2);
                  const trend = prev != null ? (latest > prev ? 'up' : latest < prev ? 'down' : 'flat') : 'flat';
                  rows.push({ metric: 'Housing Starts', value: latest, trend, fmt: v => `${v != null ? v.toLocaleString() : '—'}` });
                }
                if (permitsVals.length > 0) {
                  const latest = permitsVals.at(-2);
                  const prev = permitsVals.at(-3);
                  const trend = prev != null ? (latest > prev ? 'up' : latest < prev ? 'down' : 'flat') : 'flat';
                  rows.push({ metric: 'Building Permits', value: latest, trend, fmt: v => `${v != null ? v.toLocaleString() : '—'}` });
                }
                if (sd.monthsSupply != null) {
                  rows.push({ metric: "Months' Supply", value: sd.monthsSupply, trend: 'flat', fmt: v => `${v.toFixed(1)} mo` });
                }
                if (sd.activeListings != null) {
                  rows.push({ metric: 'Active Listings', value: sd.activeListings, trend: 'flat', fmt: v => `${v.toLocaleString()}` });
                }
                if (!rows.length) {
                  return (
                    <div className="re-mini-row" style={{ opacity: 0.7 }}>
                      <span className="re-mini-name">No supply metrics yet</span>
                    </div>
                  );
                }
                return rows.slice(0, 8).map((s, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{s.metric}</span>
                    <span className="re-mini-value" style={{ color: s.trend === 'up' ? '#4ade80' : s.trend === 'down' ? '#f87171' : '#fbbf24' }}>
                      <MetricValue value={s.value} seriesKey="supplyDemand" timestamp={lastUpdated} format={s.fmt} />
                    </span>
                  </div>
                ));
              })()}
            </div>
        ),

        'hud-afford': (
            <>
              <div className="hud-toggle-container" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }} onMouseDown={e => e.stopPropagation()}>
                <button
                  className={`hud-toggle-btn ${hudView === 'chart' ? 'active' : ''}`}
                  onClick={() => setHudView('chart')}
                >
                  Chart
                </button>
                <button
                  className={`hud-toggle-btn ${hudView === 'map' ? 'active' : ''}`}
                  onClick={() => setHudView('map')}
                >
                  Map
                </button>
              </div>
              {hudView === 'chart' ? (
                <SafeECharts option={hudOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Rental Affordability by City', source: 'HUD User / US Census', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
              ) : (
                <RentalAffordabilityMap data={hudData} />
              )}
            </>
        ),

        'census-housing': (
            <CensusHousingPanel
              kpiData={censusKpiData}
              housingKeys={CENSUS_HOUSING_KEYS}
              extraCards={housingExtraCards}
            />
        ),
        'census-trade': (
            <CensusTradePanel
              kpiData={censusKpiData}
              ecoKeys={CENSUS_ECO_KEYS}
              extraCards={tradeExtraCards}
            />
        ),
        'census-trends-housing': (
            <CensusTrendsHousingPanel housingSeries={censusHousingSeries} fetchedOn={fetchedOn} lastUpdated={lastUpdated} />
        ),
        'census-trends-trade': (
            <CensusTrendsTradePanel ecoSeries={censusEcoSeries} fetchedOn={fetchedOn} lastUpdated={lastUpdated} />
        ),
        'fhfa-hpi': (
            <div style={{ height: '100%', minHeight: 0, padding: 8 }}>
              {fhfaHpi?.dates?.length ? (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary, #eee)' }}>
                      <MetricValue value={fhfaHpi.latest?.value} seriesKey="fhfaHpi" timestamp={fhfaHpi.latest?.date} format={v => v?.toFixed(1)} />
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)' }}>index · {fhfaHpi.latest?.date || '—'}</span>
                  </div>
                  <div style={{ height: 'calc(100% - 40px)', minHeight: 0 }}>
                    <SafeECharts
                      option={{
                        animation: false, backgroundColor: 'transparent',
                        grid: { left: 40, right: 8, top: 8, bottom: 20 },
                        xAxis: { type: 'category', data: fhfaHpi.dates || [], axisLabel: { fontSize: 9, color: '#888', interval: Math.max(1, Math.floor((fhfaHpi.dates?.length || 1) / 4)) } },
                        yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#888' }, splitLine: { lineStyle: { color: '#222' } } },
                        tooltip: { trigger: 'axis' },
                        series: [{ type: 'line', data: fhfaHpi.values || [], smooth: true, symbol: 'none', lineStyle: { color: '#42a5f5', width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#42a5f540' }, { offset: 1, color: '#42a5f505' }] } } }],
                      }}
                      style={{ height: '100%', width: '100%' }}
                      sourceInfo={{ title: 'FHFA House Price Index', source: 'FHFA (via FRED)', endpoint: '/api/realEstate', series: [] }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ padding: 12, color: 'var(--text-muted, #888)', fontSize: 12 }}>
                  FHFA HPI unavailable — FRED series not loaded yet.
                </div>
              )}
            </div>
        ),
        'bis-property-prices': (
            <BisPropertyPricePanel />
        ),
        'metro-case-shiller': (
            <MetroCaseShillerPanel />
        ),
        'hud-affordability-by-metro': (
            <HudAffordabilityPanel />
        ),
  };

  const panelCtx = {
    __render: (panelId) => panelBodies[panelId] ?? null,
    __live: {
      metrics: !!isLive,
      shiller: !!isLive,
      reitetf: !!isLive,
      reitperf: !!isLive,
      foreclosure: !!isLive,
      mba: !!isLive,
      cre: !!isLive,
      caprate: !!isLive,
      afford: !!isLive,
      supply: !!isLive,
      'hud-afford': !!isLive,
      'afford-stack': !!isLive,
      'census-housing': !!isLive,
      'census-trade': !!isLive,
      'census-trends-housing': !!isLive,
      'census-trends-trade': !!isLive,
      'fhfa-hpi': !!isLive,
      'bis-property-prices': true,
      'metro-case-shiller': true,
      'hud-affordability-by-metro': true,
    },
    __subtitle: {
      metrics: 'Prices · rates · activity · distress',
      'afford-stack': `${affordabilityStack?.stressLabel || 'Partial'} payment burden · 80% LTV / 30Y fixed estimate`,
      'census-housing': `${housingExtraCards.length} indicators · Census + FRED + MBA + FHFA`,
      'census-trade': `${tradeExtraCards.length} indicators · Census + BEA + macro`,
      'bis-property-prices': 'Residential PPI · 40+ economies · FRED/BIS',
      'metro-case-shiller': 'Metro-level home price indices',
      'hud-affordability-by-metro': 'Rent-to-income ratios and home values',
    },
    __disabled: {
      'census-housing': housingExtraCards.length === 0 && !hasCensusHousingKpi,
      'census-trade': tradeExtraCards.length === 0 && !hasCensusEcoKpi,
    },
    __noFooter: {},
    __source: {
      metrics: 'FRED / Yahoo Finance',
      shiller: 'FRED CSUSHPISA',
      reitetf: 'Yahoo Finance',
      reitperf: 'Yahoo Finance',
      foreclosure: 'FRED',
      mba: 'FRED MORTGAGE30US',
      cre: 'FRED',
      caprate: 'Yahoo Finance',
      afford: 'FRED / Census',
      supply: 'FRED / Census',
      'hud-afford': 'HUD User / US Census',
      'afford-stack': 'FRED / HUD / Census',
      'census-housing': 'Census / FRED / Freddie Mac / FHFA / MBA',
      'census-trade': 'Census / BEA / FRED',
      'census-trends-housing': 'US Census Bureau (via FRED)',
      'census-trends-trade': 'US Census Bureau (via FRED)',
      'fhfa-hpi': 'FHFA (via FRED)',
      'bis-property-prices': 'BIS / FRED',
      'metro-case-shiller': 'S&P CoreLogic / FRED',
      'hud-affordability-by-metro': 'HUD / Census',
    },
  };

  return (
    <div className="re-dashboard re-dashboard--bento">
      <MarketPanelGrid
        marketId="realEstate"
        layout={dynamicLayout}
        storageKey="realestate-layout-v7"
        accent="realEstate"
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

export default React.memo(RealEstateDashboard);
