import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import DerivativesDashboard from './components/DerivativesDashboard';
import MetricValue from '../../components/MetricValue/MetricValue';
import SafeECharts from '../../components/SafeECharts/SafeECharts';
import './components/DerivativesDashboard.css';
import './DerivativesMarket.css';

function getDerivativesProps(centralData) {
  const d = centralData.data || {};
  return {
    volSurfaceData: d.volSurfaceData,
    vixTermStructure: d.vixTermStructure,
    optionsFlow: d.optionsFlow,
    vixEnrichment: d.vixEnrichment,
    volPremium: d.volPremium,
    fredVixHistory: d.fredVixHistory,
    putCallRatio: d.putCallRatio,
    skewIndex: d.skewIndex,
    skewHistory: d.skewHistory,
    gammaExposure: d.gammaExposure,
    vixPercentile: d.vixPercentile,
    termSpread: d.termSpread,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function DerivativesMarket({ centralData } = {}) {
  // Hooks must run unconditionally on every render. The previous early
  // returns above the hook calls produced "change in order of Hooks"
  // warnings whenever centralData arrived after the first render.
  const { convert, currentSymbol } = useCurrency();
  const marketData = useMarketData('derivatives');

  const kpis = React.useMemo(() => {
    const d = marketData?.data || {};
    // skewIndex is { value, interpretation }; gammaExposure is
    // { total, callGamma, putGamma, netGamma } — pull the headline number
    // out before formatting so the KPI builder doesn't blow up if upstream
    // returns the object form.
    const skewVal = typeof d.skewIndex === 'number' ? d.skewIndex : d.skewIndex?.value;
    let gexVal = undefined;
    if (d.gammaExposure != null) {
      if (typeof d.gammaExposure === 'number') {
        gexVal = d.gammaExposure;
      } else if (typeof d.gammaExposure === 'object') {
        if (d.gammaExposure.total != null) {
          gexVal = d.gammaExposure.total;
        } else if (Array.isArray(d.gammaExposure)) {
          gexVal = d.gammaExposure.reduce((s, g) => s + Math.abs(g?.value || 0), 0);
        }
      }
    }
    const fmt = (v, digits = 2) => (typeof v === 'number' ? v.toFixed(digits) : '—');
    return [
      { label: 'VIX', value: fmt(d.vixValue), color: d.vixChange >= 0 ? '#f87171' : '#4ade80', trend: typeof d.vixChange === 'number' ? `${fmt(d.vixChange)}%` : null, sublabel: 'Volatility' },
      { label: 'VIX 3M', value: fmt(d.vix3M), color: 'var(--text-primary)', trend: null, sublabel: 'Term' },
      { label: 'Put/Call', value: fmt(d.putCallRatio), color: 'var(--text-primary)', trend: null, sublabel: 'Ratio' },
      { label: 'Skew', value: fmt(skewVal), color: 'var(--text-primary)', trend: null, sublabel: 'SKEW' },
      { label: 'Gamma Exp', value: fmt(gexVal), color: 'var(--text-primary)', trend: null, sublabel: 'GEX' },
    ].filter(k => k.value !== '—');
  }, [marketData]);

  if (!centralData) return <MarketSkeleton />;
  const props = getDerivativesProps(centralData);
  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="deriv-market" role="region" aria-label="Derivatives">
      <div className="deriv-market-provenance" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
        <MetricValue value={props.lastUpdated} seriesKey="derivativesLastUpdated" timestamp={props.lastUpdated} format={v => v ? new Date(v).toLocaleString() : '—'} />
        <SafeECharts option={{}} style={{ width: 0, height: 0 }} sourceInfo={{ title: 'Derivatives Market', source: 'CBOE / CFTC / BIS / ECB', endpoint: '/api/derivatives', series: [], updatedAt: props.lastUpdated }} />
      </div>
      <div className="deriv-market-main">
        <DerivativesDashboard
          kpis={kpis}
          volSurfaceData={props.volSurfaceData}
          vixTermStructure={props.vixTermStructure}
          optionsFlow={props.optionsFlow}
          vixEnrichment={props.vixEnrichment}
          volPremium={props.volPremium}
          fredVixHistory={props.fredVixHistory}
          putCallRatio={props.putCallRatio}
          skewIndex={props.skewIndex}
          skewHistory={props.skewHistory}
          gammaExposure={props.gammaExposure}
          vixPercentile={props.vixPercentile}
          termSpread={props.termSpread}
          convert={convert}
          currentSymbol={currentSymbol}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
          fetchLog={props.fetchLog}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
        />
      </div>
    </div>
  );

}

export default React.memo(DerivativesMarket);
