import React, { useMemo } from 'react';
import { safeSlice } from '../../../utils/panelGuards';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
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
    { i: 'census-housing', x: 0, y: 12, w: 6, h: 3 },
    { i: 'census-trade', x: 6, y: 12, w: 6, h: 3 },
    { i: 'census-trends-housing', x: 0, y: 15, w: 6, h: 4 },
    { i: 'census-trends-trade', x: 6, y: 15, w: 6, h: 4 },
    { i: 'fhfa-hpi', x: 0, y: 19, w: 6, h: 3 },
    { i: 'bis-property-prices', x: 6, y: 19, w: 6, h: 5 },
    { i: 'metro-case-shiller', x: 0, y: 22, w: 6, h: 3 },
    { i: 'hud-affordability-by-metro', x: 6, y: 24, w: 6, h: 3 },
  ],
};

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

  return (
    <div className="re-dashboard re-dashboard--bento">
      <BentoWrapper layout={dynamicLayout} storageKey="realestate-layout-v7">
        {/* Key Metrics */}
        <BentoCard
          key="metrics"
          title="Key Metrics"
          subtitle="Prices · rates · activity · distress"
          accent="realEstate"
          className="re-bento-card"
          contentClassName="re-panel-content re-metrics-host"
          source="FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
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
        </BentoCard>

        {(
          <BentoCard
            key="afford-stack"
            title="Housing Affordability Stack"
            subtitle={`${affordabilityStack?.stressLabel || 'Partial'} payment burden · 80% LTV / 30Y fixed estimate`}
            accent="realEstate"
            className="re-bento-card"
            contentClassName="re-panel-scroll"
            source="FRED / HUD / Census"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        {/* Case-Shiller */}
        {(
          <BentoCard
            key="shiller"
            title="Case-Shiller Index"
            accent="realEstate"
            className="re-bento-card"
            source="FRED CSUSHPISA"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={shillerOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Case-Shiller Index', source: 'FRED', endpoint: '/api/realEstate', series: [{ id: 'CSUSHPISA' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* REIT ETF */}
        {(
          <BentoCard
            key="reitetf"
            title="REIT ETF (VNQ)"
            accent="realEstate"
            className="re-bento-card"
            source="Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={reitOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'REIT ETF (VNQ)', source: 'Yahoo Finance', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* REIT Performance */}
        {(
          <BentoCard
            key="reitperf"
            title="REIT Performance"
            accent="realEstate"
            className="re-bento-card"
            contentClassName="re-panel-scroll"
            source="Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        {/* Foreclosure */}
        {(
          <BentoCard
            key="foreclosure"
            title="Distress Indicators"
            accent="realEstate"
            className="re-bento-card"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={foreclosureOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Distress Indicators', source: 'FRED', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* MBA Applications */}
        {(
          <BentoCard
            key="mba"
            title="MBA Applications"
            accent="realEstate"
            className="re-bento-card"
            source="FRED MORTGAGE30US"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={mbaOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'MBA Applications', source: 'FRED', endpoint: '/api/realEstate', series: [{ id: 'MORTGAGE30US' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* CRE Delinquencies */}
        {(
          <BentoCard
            key="cre"
            title="CRE Delinquencies"
            accent="realEstate"
            className="re-bento-card"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={creOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CRE Delinquencies', source: 'FRED', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Cap Rates */}
        {(
          <BentoCard
            key="caprate"
            title="Cap Rates by Sector"
            accent="realEstate"
            className="re-bento-card"
            contentClassName="re-panel-scroll"
            source="Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        {/* Affordability */}
        {(
          <BentoCard
            key="afford"
            title="Affordability Index"
            accent="realEstate"
            className="re-bento-card"
            contentClassName="re-panel-scroll"
            source="FRED / Census"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        {/* Supply/Demand */}
        {(
          <BentoCard
            key="supply"
            title="Supply & Demand"
            accent="realEstate"
            className="re-bento-card"
            contentClassName="re-panel-scroll"
            source="FRED / Census"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        {/* HUD Rental Affordability */}
        {(
          <BentoCard
            key="hud-afford"
            title="Rental Affordability"
            accent="realEstate"
            className="re-bento-card hud-afford-card"
            titleActions={
              <div className="hud-toggle-container" onMouseDown={e => e.stopPropagation()}>
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
            }
            source="HUD User / US Census"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {hudView === 'chart' ? (
              <SafeECharts option={hudOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Rental Affordability by City', source: 'HUD User / US Census', endpoint: '/api/realEstate', series: [], updatedAt: lastUpdated }} />
            ) : (
              <RentalAffordabilityMap data={hudData} />
            )}
          </BentoCard>
        )}

        {/* ── Census panels (merged from former Census tab) ── */}
        {(
          <BentoCard key="census-housing" title="Housing & Construction" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusHousingPanel kpiData={censusKpiData} housingKeys={CENSUS_HOUSING_KEYS} />
          </BentoCard>
        )}
        {(
          <BentoCard key="census-trade" title="Trade & Consumption" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusTradePanel kpiData={censusKpiData} ecoKeys={CENSUS_ECO_KEYS} />
          </BentoCard>
        )}
        {(
          <BentoCard key="census-trends-housing" title="Trends — Housing & Construction" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusTrendsHousingPanel housingSeries={censusHousingSeries} fetchedOn={fetchedOn} lastUpdated={lastUpdated} />
          </BentoCard>
        )}
        {(
          <BentoCard key="census-trends-trade" title="Trends — Trade & Consumption" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusTrendsTradePanel ecoSeries={censusEcoSeries} fetchedOn={fetchedOn} lastUpdated={lastUpdated} />
          </BentoCard>
        )}
        {(
          <BentoCard key="fhfa-hpi" title="FHFA House Price Index" accent="realEstate" className="re-bento-card" contentClassName="re-panel-content" source="FHFA (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
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
          </BentoCard>
        )}
        {(
          <BentoCard
            key="bis-property-prices"
            title="BIS Property Price Comparison"
            subtitle="Residential PPI · 40+ economies · FRED/BIS"
            accent="realEstate"
            className="re-bento-card"
            contentClassName="re-panel-content bis-pp-host"
            source="BIS / FRED"
            timestamp={lastUpdated}
            isLive={true}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <BisPropertyPricePanel />
          </BentoCard>
        )}
        {(
          <BentoCard key="metro-case-shiller" title="Metro Case-Shiller" subtitle="Metro-level home price indices" accent="realEstate" className="re-bento-card" contentClassName="re-panel-scroll" source="S&P CoreLogic / FRED" timestamp={lastUpdated} isLive={true} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <MetroCaseShillerPanel />
          </BentoCard>
        )}
        {(
          <BentoCard key="hud-affordability-by-metro" title="HUD Affordability by Metro" subtitle="Rent-to-income ratios and home values" accent="realEstate" className="re-bento-card" contentClassName="re-panel-scroll" source="HUD / Census" timestamp={lastUpdated} isLive={true} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <HudAffordabilityPanel />
          </BentoCard>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(RealEstateDashboard);
