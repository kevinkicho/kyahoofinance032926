import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './InsuranceDashboard.css';

const stopDrag = (e) => e.stopPropagation();

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
    if (reinsurers) {
      const targetTickers = ['PGR', 'ALL', 'TRV', 'HIG'];
      reinsurers.forEach(r => {
        if (targetTickers.includes(r.ticker)) {
          const change = r.changePct;
          items.push({
            label: r.ticker,
            value: `${currentSymbol}${convert(r.price).toFixed(2)}`,
            color: change >= 0 ? '#4ade80' : '#f87171',
            trend: change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : null,
            sublabel: 'Reinsurer',
          });
        }
      });
    }
    const hyOas = fredHyOasHistory?.values?.[fredHyOasHistory.values.length - 1];
    if (hyOas != null) {
      items.push({
        label: 'HY OAS',
        value: `${Math.round(hyOas)} bps`,
        color: hyOas > 400 ? '#f87171' : hyOas > 300 ? '#fbbf24' : '#22c55e',
        sublabel: 'High Yield Spread',
      });
    }
    if (sectorETF?.price != null) {
      const etfChange = sectorETF.change;
      items.push({
        label: 'KIE ETF',
        value: `$${Number(sectorETF.price).toFixed(2)}`,
        color: etfChange >= 0 ? '#4ade80' : '#f87171',
        trend: etfChange != null ? `${etfChange >= 0 ? '+' : ''}${Number(etfChange).toFixed(2)}%` : null,
        sublabel: 'Insurance Sector',
      });
    }
    return items;
  }, [industryAvgCombinedRatio, reinsurers, fredHyOasHistory, sectorETF, convert, currentSymbol]);

  const layoutItems = [{ i: 'kpi', x: 0, y: 0, w: 12, h: 2 }];
  let x = 0;
  if (hyOasOption) { layoutItems.push({ i: 'hyoas', x, y: 2, w: 4, h: 3 }); x += 4; }
  if (catLossesOption) { layoutItems.push({ i: 'catloss', x, y: 2, w: 4, h: 3 }); x += 4; }
  if (combinedRatioOption) { layoutItems.push({ i: 'crhist', x, y: 2, w: 4, h: 3 }); }
  let x2 = 0;
  if (combinedRatioData?.byLine?.length > 0) { layoutItems.push({ i: 'crline', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (reinsurancePricing?.byCategory?.length > 0) { layoutItems.push({ i: 'reinsrates', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (reserveAdequacyData?.length > 0) { layoutItems.push({ i: 'reserves', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (catBondSpreads?.length > 0) { layoutItems.push({ i: 'catbonds', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }
  if (sectorETF?.length > 0) { layoutItems.push({ i: 'etfs', x: x2, y: 5, w: 4, h: 3 }); x2 += 4; }

  const dynamicLayout = { lg: layoutItems };

  return (
    <div className="ins-dashboard ins-dashboard--bento">
      <BentoWrapper layout={dynamicLayout} storageKey="insurance-layout">
        {/* KPI Strip — bento card with title row drag handle. */}
        <div key="kpi" className="ins-bento-card ins-bento-kpi">
          <div className="ins-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Insurance Key Metrics</span>
          </div>
          <div className="bento-panel-content" onMouseDown={stopDrag}>
            <MarketKpiStrip kpis={kpis} bare />
          </div>
        </div>

        {/* HY OAS */}
        {hyOasOption && (
          <div key="hyoas" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">HY OAS Spread</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={hyOasOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'HY OAS Spread', source: 'FRED', endpoint: '/api/insurance', series: [{ id: 'BAMLH0A0HYM2' }], updatedAt: lastUpdated }} />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Cat Losses */}
        {catLossesOption && (
          <div key="catloss" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Natural Catastrophe Losses</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={catLossesOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Natural Catastrophe Losses', source: 'FRED / Server', endpoint: '/api/insurance', series: [], updatedAt: lastUpdated }} />
            </div>
            <DataFooter source="FRED / Server" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Combined Ratio History */}
        {combinedRatioOption && (
          <div key="crhist" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Industry Combined Ratio</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={combinedRatioOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Industry Combined Ratio', source: 'FRED / A.M. Best', endpoint: '/api/insurance', series: [], updatedAt: lastUpdated }} />
            </div>
            <DataFooter source="FRED / A.M. Best" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Combined Ratio by Line */}
        {combinedRatioData?.byLine?.length > 0 && (
          <div key="crline" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Combined Ratio by Line</span>
            </div>
            <div className="bento-panel-content ins-panel-scroll" onMouseDown={stopDrag}>
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
            </div>
            <DataFooter source="FRED / NAIC" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Reinsurance Rates */}
        {reinsurancePricing?.byCategory?.length > 0 && (
          <div key="reinsrates" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Reinsurance Rates</span>
            </div>
            <div className="bento-panel-content ins-panel-scroll" onMouseDown={stopDrag}>
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
            </div>
            <DataFooter source="FRED / Server" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Reserve Adequacy */}
        {reserveAdequacyData?.length > 0 && (
          <div key="reserves" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Reserve Adequacy</span>
            </div>
            <div className="bento-panel-content ins-panel-scroll" onMouseDown={stopDrag}>
              <div className="ins-mini-table" style={{ paddingTop: 0 }}>
                {reserveAdequacyData.slice(0, 8).map((r) => (
                  <div key={r.insurer} className="ins-mini-row">
                    <span className="ins-mini-name">{r.insurer}</span>
                    <span className="ins-mini-value" style={{ color: r.ratio > 1.1 ? '#4ade80' : r.ratio < 1 ? '#f87171' : '#fbbf24' }}>
                      <MetricValue value={r.ratio} seriesKey="reserveAdequacy" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}x` : '—'} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / NAIC" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Cat Bond Spreads */}
        {catBondSpreads?.length > 0 && (
          <div key="catbonds" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Cat Bond Spreads</span>
            </div>
            <div className="bento-panel-content ins-panel-scroll" onMouseDown={stopDrag}>
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
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Sector ETFs */}
        {sectorETF?.length > 0 && (
          <div key="etfs" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Sector ETFs</span>
            </div>
            <div className="bento-panel-content ins-panel-scroll" onMouseDown={stopDrag}>
              <div className="ins-mini-table" style={{ paddingTop: 0 }}>
                {sectorETF.slice(0, 8).map((e) => (
                  <div key={e.symbol} className="ins-mini-row">
                    <span className="ins-mini-name">{e.symbol}</span>
                    <span className="ins-mini-value" style={{ color: (e.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={e.changePct || 0} seriesKey="insuranceSectorEtf" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(InsuranceDashboard);