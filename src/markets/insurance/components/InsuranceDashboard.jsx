import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
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
  isLive, lastUpdated, fetchLog,
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
    if (!combinedRatioHistory?.values?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: combinedRatioHistory.quarters, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', name: '%', min: 80, max: 110, nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: combinedRatioHistory.values, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#8b5cf6', width: 2 }, markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: colors.textDim }, data: [{ yAxis: 100, label: { position: 'end', formatter: '100%', fontSize: 9, color: colors.textMuted } }] } }],
    };
  }, [combinedRatioHistory, colors]);

  const layoutItems = [{ i: 'metrics', x: 0, y: 0, w: 3, h: 4 }];
  let x = 3;
  if (hyOasOption) { layoutItems.push({ i: 'hyoas', x, y: 0, w: 3, h: 3 }); x += 3; }
  if (catLossesOption) { layoutItems.push({ i: 'catloss', x, y: 0, w: 3, h: 3 }); x += 3; }
  if (combinedRatioOption) { layoutItems.push({ i: 'crhist', x, y: 0, w: 3, h: 3 }); }
  let x2 = 3;
  if (combinedRatioData?.byLine?.length > 0) { layoutItems.push({ i: 'crline', x: x2, y: 3, w: 3, h: 3 }); x2 += 3; }
  if (reinsurancePricing?.byCategory?.length > 0) { layoutItems.push({ i: 'reinsrates', x: x2, y: 3, w: 3, h: 3 }); x2 += 3; }
  if (reserveAdequacyData?.length > 0) { layoutItems.push({ i: 'reserves', x: x2, y: 3, w: 3, h: 3 }); x2 += 3; }
  if (catBondSpreads?.length > 0) { layoutItems.push({ i: 'catbonds', x: x2, y: 3, w: 3, h: 3 }); x2 += 3; }
  if (sectorETF?.length > 0) { layoutItems.push({ i: 'etfs', x: x2, y: 3, w: 3, h: 3 }); x2 += 3; }

  const dynamicLayout = { lg: layoutItems };

  return (
    <div className="ins-dashboard ins-dashboard--bento">
      <BentoWrapper layout={dynamicLayout} storageKey="insurance-layout">
        {/* Key Metrics */}
        <div key="metrics" className="ins-bento-card">
          <div className="ins-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content ins-panel-scroll" onMouseDown={stopDrag}>
            {combinedRatioData && (
              <div className="ins-sidebar-section">
                <div className="ins-sidebar-title">Combined Ratio</div>
                <div className="ins-metric-card">
                  {typeof combinedRatioData.industry === 'number' && (
                    <div className="ins-metric-row">
                      <span className="ins-metric-name">Industry</span>
                      <span className="ins-metric-num" style={{ color: combinedRatioData.industry > 100 ? '#f87171' : '#4ade80' }}>
                        {combinedRatioData.industry.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {typeof industryAvgCombinedRatio === 'number' && (
                    <div className="ins-metric-row">
                      <span className="ins-metric-name">Avg</span>
                      <span className="ins-metric-num" style={{ color: industryAvgCombinedRatio > 100 ? '#f87171' : '#4ade80' }}>
                        {industryAvgCombinedRatio.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {reinsurers?.length > 0 && (
              <div className="ins-sidebar-section">
                <div className="ins-sidebar-title">Reinsurers</div>
                <div className="ins-metric-card">
                  {reinsurers.slice(0, 4).map((r) => (
                    <div key={r.ticker} className="ins-metric-row">
                      <span className="ins-metric-name">{r.ticker}</span>
                      <span className="ins-metric-num" style={{ color: (r.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                        {fmtChangePct(r.changePct)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          <DataFooter source="Yahoo Finance / FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
        </div>

        {/* HY OAS */}
        {hyOasOption && (
          <div key="hyoas" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">HY OAS Spread</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={hyOasOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* Cat Losses */}
        {catLossesOption && (
          <div key="catloss" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Natural Catastrophe Losses</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={catLossesOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / Server" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}

        {/* Combined Ratio History */}
        {combinedRatioOption && (
          <div key="crhist" className="ins-bento-card">
            <div className="ins-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Industry Combined Ratio</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={combinedRatioOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / A.M. Best" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
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
                      {l.ratio?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / NAIC" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
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
                {reinsurancePricing.byCategory.slice(0, 8).map((c) => (
                  <div key={c.category} className="ins-mini-row">
                    <span className="ins-mini-name">{c.category}</span>
                    <span className="ins-mini-value">{c.rate?.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / Server" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
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
                      {r.ratio?.toFixed(2)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / NAIC" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
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
                      {b.spread?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
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
                      {(e.changePct || 0) >= 0 ? '+' : ''}{(e.changePct || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(InsuranceDashboard);