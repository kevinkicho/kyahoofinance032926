import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MetricValue from '../../../components/MetricValue/MetricValue';
import {
  HousingPanel as CensusHousingPanel,
  TradePanel as CensusTradePanel,
  TrendsHousingPanel as CensusTrendsHousingPanel,
  TrendsTradePanel as CensusTrendsTradePanel,
  HOUSING_KEYS as CENSUS_HOUSING_KEYS,
  ECO_KEYS as CENSUS_ECO_KEYS,
  useCensusData,
} from '../../census/components/CensusDashboard';
import './RealEstateDashboard.css';

function latestNumber(value, keys = ['values']) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of keys) {
    const series = value[key];
    if (Array.isArray(series)) {
      for (let i = series.length - 1; i >= 0; i -= 1) {
        if (typeof series[i] === 'number' && Number.isFinite(series[i])) return series[i];
      }
    }
  }
  return null;
}

function getCommoditySnapshot(data) {
  if (!data || typeof data !== 'object') return null;
  const futures = data.yahoo?.futures || {};
  const goldPrice = data.gold?.price ?? data.fred?.gold_am?.value ?? futures['GC=F']?.price ?? null;
  const wtiPrice = data.wti?.price ?? data.eia?.wti_price?.value ?? data.fred?.wti?.value ?? futures['CL=F']?.price ?? null;
  const natGasPrice = data.natGas?.price ?? data.eia?.henry_hub?.value ?? data.fred?.natgas?.value ?? futures['NG=F']?.price ?? null;
  const goldOilRatio = typeof data.goldOilRatio === 'number'
    ? data.goldOilRatio
    : goldPrice != null && wtiPrice
      ? goldPrice / wtiPrice
      : null;

  if (goldPrice == null && wtiPrice == null && natGasPrice == null && goldOilRatio == null) return null;
  return { goldPrice, wtiPrice, natGasPrice, goldOilRatio };
}

function RentalAffordabilityMap({ data }) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current || !window.L || !data) return;

    // Center map on the geographic center of the contiguous US
    const map = window.L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([37.8, -96], 4);

    mapRef.current = map;

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    window.L.control.zoom({ position: 'topright' }).addTo(map);

    data.forEach(d => {
      if (d.lat == null || d.lng == null) return;

      const val = d.ratio;
      let color = '#10b981'; // Green
      if (val > 40) color = '#ef4444'; // Red
      else if (val > 30) color = '#f59e0b'; // Orange

      const marker = window.L.circleMarker([d.lat, d.lng], {
        radius: 6,
        fillColor: color,
        color: '#111827',
        weight: 1.5,
        fillOpacity: 0.85
      }).addTo(map);

      const popupContent = `
        <div class="leaflet-dark-popup">
          <div class="popup-title">${d.city}</div>
          <div class="popup-grid">
            <div class="popup-row">
              <span class="popup-label">Rent-to-Income:</span>
              <span class="popup-val" style="color: ${color}; font-weight: 600;">${val ? val.toFixed(1) + '%' : 'N/A'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">2B FMR Rent:</span>
              <span class="popup-val">$${d.rent ? d.rent.toLocaleString() : 'N/A'}/mo</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Median Income:</span>
              <span class="popup-val">$${d.income ? d.income.toLocaleString() : 'N/A'}/yr</span>
            </div>
            ${d.homeValue ? `
            <div class="popup-divider"></div>
            <div class="popup-row">
              <span class="popup-label">Census Home Value:</span>
              <span class="popup-val">$${d.homeValue.toLocaleString()}</span>
            </div>
            ` : ''}
            ${d.homeownership ? `
            <div class="popup-row">
              <span class="popup-label">Homeownership Rate:</span>
              <span class="popup-val">${d.homeownership.toFixed(1)}%</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'dark-popup-wrapper',
        closeButton: false
      });
    });

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data]);

  return <div ref={containerRef} className="re-hud-map" style={{ height: '100%', width: '100%', borderRadius: '6px' }} />;
}


const LAYOUT = {
  lg: [
    { i: 'metrics',    x: 0,  y: 0, w: 3,  h: 5 },
    { i: 'shiller',    x: 3,  y: 0, w: 3,  h: 3 },
    { i: 'reitetf',    x: 6,  y: 0, w: 3,  h: 3 },
    { i: 'reitperf',   x: 9,  y: 0, w: 3,  h: 3 },
    { i: 'foreclosure', x: 3,  y: 3, w: 3,  h: 3 },
    { i: 'mba',        x: 6,  y: 3, w: 3,  h: 3 },
    { i: 'cre',        x: 9,  y: 3, w: 3,  h: 3 },
  ]
};

function RealEstateDashboard({
  priceIndexData, reitData, affordabilityData, capRateData, mortgageRates,
  caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y,
  housingStarts, existingHomeSales, rentalVacancy, medianHomePrice,
  foreclosureData, mbaApplications, creDelinquencies, commoditiesData, censusData,
  hudData, fetchLog, isLive, lastUpdated, error, fetchedOn, isCurrent,
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
      .filter(d => d.ratio != null)
      .sort((a, b) => b.ratio - a.ratio);

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
    if (!reitEtf?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: reitEtf.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(reitEtf.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: reitEtf.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 }, areaStyle: { color: 'rgba(20,184,166,0.1)' } }],
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

  // Conditionally include optional panels
  const layoutItems = [{ i: 'metrics', x: 0, y: 0, w: 3, h: 5 }];
  let x = 3;
  const chartH = 3;
  if (shillerOption) { layoutItems.push({ i: 'shiller', x, y: 0, w: 3, h: chartH }); x += 3; }
  if (reitOption) { layoutItems.push({ i: 'reitetf', x, y: 0, w: 3, h: chartH }); x += 3; }
  if (reitData?.length > 0) { layoutItems.push({ i: 'reitperf', x, y: 0, w: 3, h: chartH }); x += 3; }
  let x2 = 3;
  if (foreclosureOption) { layoutItems.push({ i: 'foreclosure', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }
  if (mbaOption) { layoutItems.push({ i: 'mba', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }
  if (creOption) { layoutItems.push({ i: 'cre', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }
  if (capRateData?.length > 0) { layoutItems.push({ i: 'caprate', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }
  if (affordabilityData?.length > 0) { layoutItems.push({ i: 'afford', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }
  if (supplyData?.length > 0) { layoutItems.push({ i: 'supply', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }
  if (hudData?.length > 0) { layoutItems.push({ i: 'hud-afford', x: x2, y: chartH, w: 3, h: chartH }); x2 += 3; }

  // Census panels (merged from former Census tab) — placed below RE panels.
  const censusY = chartH * 2;
  if (hasCensusHousingKpi) layoutItems.push({ i: 'census-housing', x: 0, y: censusY, w: 6, h: 3 });
  if (hasCensusEcoKpi)     layoutItems.push({ i: 'census-trade',   x: 6, y: censusY, w: 6, h: 3 });
  if (hasCensusHousingTrends) layoutItems.push({ i: 'census-trends-housing', x: 0, y: censusY + 3, w: 6, h: 4 });
  if (hasCensusEcoTrends)     layoutItems.push({ i: 'census-trends-trade',   x: 6, y: censusY + 3, w: 6, h: 4 });

  const dynamicLayout = { lg: layoutItems };

  return (
    <div className="re-dashboard re-dashboard--bento">
      <BentoWrapper layout={dynamicLayout} storageKey="realestate-layout-v3">
        {/* Key Metrics */}
        <BentoCard
          key="metrics"
          title="Key Metrics"
          accent="realEstate"
          className="re-bento-card"
          contentClassName="re-panel-scroll"
          source="FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <>
            {typeof shillerLatest === 'number' && (
              <div className="re-sidebar-section">
                <div className="re-sidebar-title">Home Prices</div>
                <div className="re-metric-card">
                  <div className="re-metric-label">Case-Shiller</div>
                  <div className="re-metric-value" style={{ color: '#60a5fa' }}><MetricValue value={shillerLatest} seriesKey="caseShiller" timestamp={lastUpdated} format={v => v.toFixed(1)} /></div>
                </div>
                {(() => {
                  const v = medianHomePriceLatest;
                  if (typeof v !== 'number') return null;
                  return (
                    <div className="re-metric-card">
                      <div className="re-metric-row">
                        <span className="re-metric-name">Median Price</span>
                        <span className="re-metric-num"><MetricValue value={v} seriesKey="medianHomePrice" timestamp={lastUpdated} format={x => typeof x === 'number' ? `$${(x / 1000).toFixed(0)}K` : '—'} /></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {mortgageRates && (
              <div className="re-sidebar-section">
                <div className="re-sidebar-title">Mortgage Rates</div>
                <div className="re-metric-card">
                  {typeof mortgageRates.rate30y === 'number' && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">30Y Fixed</span>
                      <span className="re-metric-num" style={{ color: mortgageRates.rate30y > 7 ? '#f87171' : mortgageRates.rate30y > 5 ? '#fbbf24' : '#4ade80' }}>
                        <MetricValue value={mortgageRates.rate30y} seriesKey="mortgage30y" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
                      </span>
                    </div>
                  )}
                  {typeof mortgageRates.rate15y === 'number' && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">15Y Fixed</span>
                       <span className="re-metric-num"><MetricValue value={mortgageRates.rate15y} seriesKey="mortgage15y" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} /></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="re-sidebar-section">
              <div className="re-sidebar-title">Activity</div>
              <div className="re-metric-card">
                {(() => {
                  const v = housingStartsLatest;
                  if (typeof v !== 'number') return null;
                  return (
                    <div className="re-metric-row">
                      <span className="re-metric-name">Housing Starts</span>
                      <span className="re-metric-num"><MetricValue value={v} seriesKey="housingStarts" timestamp={lastUpdated} format={x => typeof x === 'number' ? `${(x / 1000).toFixed(1)}M` : '—'} /></span>
                    </div>
                  );
                })()}
                {(() => {
                  const v = existingHomeSalesLatest;
                  if (typeof v !== 'number') return null;
                  return (
                    <div className="re-metric-row">
                      <span className="re-metric-name">Existing Sales</span>
                      <span className="re-metric-num"><MetricValue value={v} seriesKey="existingHomeSales" timestamp={lastUpdated} format={x => typeof x === 'number' ? `${(x / 1000).toFixed(1)}M` : '—'} /></span>
                    </div>
                  );
                })()}
                {typeof homeownershipRate === 'number' && (
                  <div className="re-metric-row">
                    <span className="re-metric-name">Homeownership</span>
                     <span className="re-metric-num"><MetricValue value={homeownershipRate} seriesKey="homeownershipRate" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} /></span>
                  </div>
                )}
                {typeof rentalVacancy === 'number' && (
                  <div className="re-metric-row">
                    <span className="re-metric-name">Rental Vacancy</span>
                     <span className="re-metric-num"><MetricValue value={rentalVacancy} seriesKey="rentalVacancy" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} /></span>
                  </div>
                )}
              </div>
            </div>

            {(foreclosureData?.foreclosures?.values?.length || foreclosureData?.delinquencies?.values?.length) && (
              <div className="re-sidebar-section">
                <div className="re-sidebar-title">Distress</div>
                <div className="re-metric-card">
                  {foreclosureData?.foreclosures?.values && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">Foreclosure Rate</span>
                      <span className="re-metric-num" style={{ color: '#f87171' }}>
                        <MetricValue value={foreclosureData?.foreclosures?.values?.[foreclosureData.foreclosures.values.length - 1]} seriesKey="foreclosureRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
                      </span>
                    </div>
                  )}
                  {foreclosureData?.delinquencies?.values && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">Delinquency</span>
                      <span className="re-metric-num" style={{ color: '#fbbf24' }}>
                        <MetricValue value={foreclosureData?.delinquencies?.values?.[foreclosureData.delinquencies.values.length - 1]} seriesKey="delinquencyRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                      </span>
                    </div>
                  )}
                  {creDelinquencies?.values && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">CRE Delinq</span>
                      <span className="re-metric-num" style={{ color: '#8b5cf6' }}>
                        <MetricValue value={creDelinquencies?.values?.[creDelinquencies.values.length - 1]} seriesKey="creDelinquencyRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                      </span>
                     </div>
                   )}
                 </div>
               </div>
             )}

             {commoditySnapshot && (
               <div className="re-sidebar-section">
                 <div className="re-sidebar-title">Commodities</div>
                 <div className="re-metric-card">
                   {commoditySnapshot.goldPrice != null && (
                     <div className="re-metric-row">
                       <span className="re-metric-name">Gold</span>
                       <span className="re-metric-num"><MetricValue value={commoditySnapshot.goldPrice} seriesKey="goldPrice" timestamp={lastUpdated} format={v => `$${v.toLocaleString()}`} /></span>
                     </div>
                   )}
                   {commoditySnapshot.wtiPrice != null && (
                     <div className="re-metric-row">
                       <span className="re-metric-name">WTI Oil</span>
                       <span className="re-metric-num"><MetricValue value={commoditySnapshot.wtiPrice} seriesKey="wtiPrice" timestamp={lastUpdated} format={v => `$${v.toFixed(2)}`} /></span>
                     </div>
                   )}
                   {commoditySnapshot.natGasPrice != null && (
                     <div className="re-metric-row">
                       <span className="re-metric-name">Nat Gas</span>
                       <span className="re-metric-num"><MetricValue value={commoditySnapshot.natGasPrice} seriesKey="natGasPrice" timestamp={lastUpdated} format={v => `$${v.toFixed(3)}`} /></span>
                     </div>
                   )}
                   {typeof commoditySnapshot.goldOilRatio === 'number' && (
                     <div className="re-metric-row">
                       <span className="re-metric-name">Gold/Oil Ratio</span>
                       <span className="re-metric-num"><MetricValue value={commoditySnapshot.goldOilRatio} seriesKey="goldOilRatio" timestamp={lastUpdated} format={v => v.toFixed(2)} /></span>
                     </div>
                   )}
                 </div>
               </div>
             )}
           </>
        </BentoCard>

        {/* Case-Shiller */}
        {shillerOption && (
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
        {reitOption && (
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
        {reitData?.length > 0 && (
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
              {reitData.slice(0, 8).map((r, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{r.symbol}</span>
                  <span className="re-mini-value" style={{ color: (r.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                    <MetricValue value={r.changePct || 0} seriesKey="reitPerformance" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Foreclosure */}
        {foreclosureOption && (
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
        {mbaOption && (
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
        {creOption && (
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
        {capRateData?.length > 0 && (
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
              {capRateData.slice(0, 8).map((c, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{c.sector}</span>
                  <span className="re-mini-value"><MetricValue value={c.impliedYield ?? c.capRate} seriesKey="capRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Affordability */}
        {affordabilityData?.length > 0 && (
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
              {affordabilityData.slice(0, 8).map((a, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{a.region}</span>
                  <span className="re-mini-value" style={{ color: a.index > 100 ? '#4ade80' : a.index > 80 ? '#fbbf24' : '#f87171' }}>
                    <MetricValue value={a.index} seriesKey="affordabilityIndex" timestamp={lastUpdated} format={v => v != null ? v.toFixed(0) : '—'} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Supply/Demand */}
        {supplyData?.length > 0 && (
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
              {supplyData.slice(0, 8).map((s, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{s.metric}</span>
                  <span className="re-mini-value" style={{ color: s.trend === 'up' ? '#4ade80' : s.trend === 'down' ? '#f87171' : '#fbbf24' }}>
                    <MetricValue value={s.value} seriesKey="supplyDemand" timestamp={lastUpdated} format={v => v != null ? `${v}` : '—'} />
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* HUD Rental Affordability */}
        {hudData?.length > 0 && (
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
        {hasCensusHousingKpi && (
          <BentoCard key="census-housing" title="Housing & Construction" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusHousingPanel kpiData={censusKpiData} housingKeys={CENSUS_HOUSING_KEYS} />
          </BentoCard>
        )}
        {hasCensusEcoKpi && (
          <BentoCard key="census-trade" title="Trade & Consumption" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusTradePanel kpiData={censusKpiData} ecoKeys={CENSUS_ECO_KEYS} />
          </BentoCard>
        )}
        {hasCensusHousingTrends && (
          <BentoCard key="census-trends-housing" title="Trends — Housing & Construction" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusTrendsHousingPanel housingSeries={censusHousingSeries} fetchedOn={fetchedOn} lastUpdated={lastUpdated} />
          </BentoCard>
        )}
        {hasCensusEcoTrends && (
          <BentoCard key="census-trends-trade" title="Trends — Trade & Consumption" accent="realEstate" className="re-bento-card" source="US Census Bureau (via FRED)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <CensusTrendsTradePanel ecoSeries={censusEcoSeries} fetchedOn={fetchedOn} lastUpdated={lastUpdated} />
          </BentoCard>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(RealEstateDashboard);
