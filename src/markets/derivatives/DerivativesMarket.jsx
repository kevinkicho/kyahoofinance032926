import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import DerivativesDashboard from './components/DerivativesDashboard';
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
    // VIX term structure labels: ['9D','1M','3M','6M'] — use 1M as spot VIX.
    const ts = d.vixTermStructure;
    const idxOf = (label) => {
      const i = ts?.dates?.indexOf?.(label);
      return i != null && i >= 0 ? i : -1;
    };
    const at = (label) => {
      const i = idxOf(label);
      if (i < 0) return null;
      const v = ts?.values?.[i];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    };
    const prevAt = (label) => {
      const i = idxOf(label);
      if (i < 0) return null;
      const v = ts?.prevValues?.[i];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    };

    const vix = at('1M') ?? at('9D');
    const vixPrev = prevAt('1M') ?? prevAt('9D');
    const vix3m = at('3M');
    const vixChgPts = vix != null && vixPrev != null && vixPrev !== 0
      ? ((vix - vixPrev) / vixPrev) * 100
      : null;

    // skewIndex is { value, interpretation }; gammaExposure is strike array
    // or { total }. Pull a headline number for the KPI strip.
    const skewVal = typeof d.skewIndex === 'number' ? d.skewIndex : d.skewIndex?.value;
    let gexVal = null;
    if (typeof d.gammaExposure === 'number') {
      gexVal = d.gammaExposure;
    } else if (d.gammaExposure && typeof d.gammaExposure === 'object') {
      if (typeof d.gammaExposure.total === 'number') gexVal = d.gammaExposure.total;
      else if (Array.isArray(d.gammaExposure)) {
        gexVal = d.gammaExposure.reduce((s, g) => s + Math.abs(g?.value || 0), 0);
      }
    }

    // MetricValue needs raw number + format + seriesKey so pills open the
    // provenance popover (series ID, source, timestamp).
    const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const fmt2 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '—');
    const fmt1 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—');
    const pcr = n(d.putCallRatio);
    const skew = n(skewVal);
    const gex = n(gexVal);
    const chg = n(vixChgPts);

    return [
      {
        label: 'VIX',
        rawValue: vix,
        value: fmt2(vix),
        format: fmt2,
        seriesKey: 'vix',
        color: chg != null ? (chg >= 0 ? '#f87171' : '#4ade80') : undefined,
        trend: chg != null ? `${chg >= 0 ? '+' : ''}${fmt2(chg)}%` : null,
        sublabel: 'Volatility',
      },
      {
        label: 'VIX 3M',
        rawValue: vix3m,
        value: fmt2(vix3m),
        format: fmt2,
        seriesKey: 'vix3m',
        color: 'var(--text-primary)',
        sublabel: 'Term',
      },
      {
        label: 'Put/Call',
        rawValue: pcr,
        value: fmt2(pcr),
        format: fmt2,
        seriesKey: 'putCallRatio',
        color: 'var(--text-primary)',
        sublabel: 'Ratio',
      },
      {
        label: 'Skew',
        rawValue: skew,
        value: fmt1(skew),
        format: fmt1,
        seriesKey: 'skew',
        color: 'var(--text-primary)',
        sublabel: 'SKEW',
      },
      {
        label: 'Gamma Exp',
        rawValue: gex,
        value: typeof gex === 'number'
          ? `$${Math.abs(gex).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`
          : '—',
        format: (v) => {
          if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
          const body = Math.abs(v).toLocaleString('en-US', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });
          return `$${body}B`;
        },
        seriesKey: 'gammaExposure',
        color: 'var(--text-primary)',
        sublabel: 'GEX',
      },
    ].filter((k) => k.rawValue != null);
  }, [marketData]);

  if (!centralData) return <MarketSkeleton />;
  const props = getDerivativesProps(centralData);
  if (props.isLoading) return <MarketSkeleton />;

  return (
    // KPI strip is now a real bento child rendered inside
    // DerivativesDashboard's BentoWrapper (passed via the `kpis` prop).
    // The "Key Metrics" sidebar panel was already in there.
    <div className="deriv-market" role="region" aria-label="Derivatives">
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
