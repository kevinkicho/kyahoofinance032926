import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
import './RealEstateDashboard.css';

const stopDrag = (e) => e.stopPropagation();

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
  foreclosureData, mbaApplications, creDelinquencies,
  fetchLog, isLive, lastUpdated,
}) {
  const { colors } = useTheme();

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

  const dynamicLayout = { lg: layoutItems };

  return (
    <div className="re-dashboard re-dashboard--bento">
      <BentoWrapper layout={dynamicLayout} storageKey="realestate-layout">
        {/* Key Metrics */}
        <div key="metrics" className="re-bento-card">
          <div className="re-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content re-panel-scroll" onMouseDown={stopDrag}>
            {typeof shillerLatest === 'number' && (
              <div className="re-sidebar-section">
                <div className="re-sidebar-title">Home Prices</div>
                <div className="re-metric-card">
                  <div className="re-metric-label">Case-Shiller</div>
                  <div className="re-metric-value" style={{ color: '#60a5fa' }}>{shillerLatest.toFixed(1)}</div>
                </div>
                {typeof medianHomePrice === 'number' && (
                  <div className="re-metric-card">
                    <div className="re-metric-row">
                      <span className="re-metric-name">Median Price</span>
                      <span className="re-metric-num">${(medianHomePrice / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mortgageRates && (
              <div className="re-sidebar-section">
                <div className="re-sidebar-title">Mortgage Rates</div>
                <div className="re-metric-card">
                  {typeof mortgageRates.rate30Y === 'number' && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">30Y Fixed</span>
                      <span className="re-metric-num" style={{ color: mortgageRates.rate30Y > 7 ? '#f87171' : mortgageRates.rate30Y > 5 ? '#fbbf24' : '#4ade80' }}>
                        {mortgageRates.rate30Y.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {typeof mortgageRates.rate15Y === 'number' && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">15Y Fixed</span>
                      <span className="re-metric-num">{mortgageRates.rate15Y.toFixed(2)}%</span>
                    </div>
                  )}
                  {typeof mortgageRates.rate5YArm === 'number' && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">5/1 ARM</span>
                      <span className="re-metric-num">{mortgageRates.rate5YArm.toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="re-sidebar-section">
              <div className="re-sidebar-title">Activity</div>
              <div className="re-metric-card">
                {typeof housingStarts === 'number' && (
                  <div className="re-metric-row">
                    <span className="re-metric-name">Housing Starts</span>
                    <span className="re-metric-num">{(housingStarts / 1000).toFixed(1)}M</span>
                  </div>
                )}
                {typeof existingHomeSales === 'number' && (
                  <div className="re-metric-row">
                    <span className="re-metric-name">Existing Sales</span>
                    <span className="re-metric-num">{(existingHomeSales / 1000).toFixed(1)}M</span>
                  </div>
                )}
                {typeof homeownershipRate === 'number' && (
                  <div className="re-metric-row">
                    <span className="re-metric-name">Homeownership</span>
                    <span className="re-metric-num">{homeownershipRate.toFixed(1)}%</span>
                  </div>
                )}
                {typeof rentalVacancy === 'number' && (
                  <div className="re-metric-row">
                    <span className="re-metric-name">Rental Vacancy</span>
                    <span className="re-metric-num">{rentalVacancy.toFixed(1)}%</span>
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
                        {foreclosureData.foreclosures.values[foreclosureData.foreclosures.values.length - 1]?.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {foreclosureData?.delinquencies?.values && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">Delinquency</span>
                      <span className="re-metric-num" style={{ color: '#fbbf24' }}>
                        {foreclosureData.delinquencies.values[foreclosureData.delinquencies.values.length - 1]?.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {creDelinquencies?.values && (
                    <div className="re-metric-row">
                      <span className="re-metric-name">CRE Delinq</span>
                      <span className="re-metric-num" style={{ color: '#8b5cf6' }}>
                        {creDelinquencies.values[creDelinquencies.values.length - 1]?.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
        </div>

        {/* Case-Shiller */}
        {shillerOption && (
          <div key="shiller" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Case-Shiller Index</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={shillerOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED CSUSHPISA" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* REIT ETF */}
        {reitOption && (
          <div key="reitetf" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">REIT ETF (VNQ)</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={reitOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* REIT Performance */}
        {reitData?.length > 0 && (
          <div key="reitperf" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">REIT Performance</span>
            </div>
            <div className="bento-panel-content re-panel-scroll" onMouseDown={stopDrag}>
              <div className="re-mini-table" style={{ paddingTop: 0 }}>
                {reitData.slice(0, 8).map((r, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{r.symbol}</span>
                    <span className="re-mini-value" style={{ color: (r.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      {(r.changePct || 0) >= 0 ? '+' : ''}{(r.changePct || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* Foreclosure */}
        {foreclosureOption && (
          <div key="foreclosure" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Distress Indicators</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={foreclosureOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* MBA Applications */}
        {mbaOption && (
          <div key="mba" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">MBA Applications</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={mbaOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED MORTGAGE30US" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* CRE Delinquencies */}
        {creOption && (
          <div key="cre" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">CRE Delinquencies</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={creOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* Cap Rates */}
        {capRateData?.length > 0 && (
          <div key="caprate" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Cap Rates by Sector</span>
            </div>
            <div className="bento-panel-content re-panel-scroll" onMouseDown={stopDrag}>
              <div className="re-mini-table" style={{ paddingTop: 0 }}>
                {capRateData.slice(0, 8).map((c, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{c.sector}</span>
                    <span className="re-mini-value">{c.capRate?.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* Affordability */}
        {affordabilityData?.length > 0 && (
          <div key="afford" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Affordability Index</span>
            </div>
            <div className="bento-panel-content re-panel-scroll" onMouseDown={stopDrag}>
              <div className="re-mini-table" style={{ paddingTop: 0 }}>
                {affordabilityData.slice(0, 8).map((a, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{a.region}</span>
                    <span className="re-mini-value" style={{ color: a.index > 100 ? '#4ade80' : a.index > 80 ? '#fbbf24' : '#f87171' }}>
                      {a.index?.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / Census" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* Supply/Demand */}
        {supplyData?.length > 0 && (
          <div key="supply" className="re-bento-card">
            <div className="re-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Supply & Demand</span>
            </div>
            <div className="bento-panel-content re-panel-scroll" onMouseDown={stopDrag}>
              <div className="re-mini-table" style={{ paddingTop: 0 }}>
                {supplyData.slice(0, 8).map((s, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{s.metric}</span>
                    <span className="re-mini-value" style={{ color: s.trend === 'up' ? '#4ade80' : s.trend === 'down' ? '#f87171' : '#fbbf24' }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / Census" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(RealEstateDashboard);