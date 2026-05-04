import React, { useMemo } from 'react';
import AlertsDashboard from './components/AlertsDashboard';
import MarketSkeleton from '../../hub/MarketSkeleton';
import DataFooter from '../../components/DataFooter/DataFooter';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import './components/AlertsDashboard.css';
import './AlertsMarket.css';

const ALERT_SOURCES = {
  'vix-spike': ['derivatives', 'sentiment'],
  'curve-inversion': ['bonds'],
  'hy-spread-wide': ['credit'],
  'fear-extreme': ['sentiment'],
  'greed-extreme': ['sentiment'],
  'btc-crash': ['crypto'],
  'gold-rally': ['commodities'],
  'dxy-move': ['fx'],
};

function getAlertsProps(centralData) {
  const d = centralData.data || {};
  const rawAlerts = d.alerts || [];
  const alerts = rawAlerts.map(a => ({
    ...a,
    sources: ALERT_SOURCES[a.id] || [a.market],
  }));
  const rawRules = d.rules || [];
  const rules = rawRules.map(r => ({
    ...r,
    sources: ALERT_SOURCES[r.id] || [r.market],
  }));
  return {
    alerts,
    rules,
    isLive: centralData.isLive,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    lastUpdated: centralData.lastUpdated,
    refetch: centralData.refetch,
    isLoading: centralData.isLoading,
  };
}

function AlertsMarket({ centralData } = {}) {
  const { convert, currentSymbol } = useCurrency();
  // Pull histories from sister markets to feed the Cross-Market Correlations
  // heatmap. Each panel only needs an array of numbers (returns OR levels —
  // Pearson is scale-invariant). When a series is missing we drop it from
  // the matrix rather than paint a stripe of zeros.
  const sentimentCtx = useMarketData('sentiment');
  const fxCtx = useMarketData('fx');
  const bondsCtx = useMarketData('bonds');
  const derivCtx = useMarketData('derivatives');
  const correlationData = useMemo(() => {
    const assets = sentimentCtx?.data?.returnsData?.assets || [];
    const findReturns = t => assets.find(a => a.ticker === t)?.dailyReturns || [];
    const dgs10 = bondsCtx?.data?.yieldHistory?.dgs10 || [];
    const dxyHist = fxCtx?.data?.dxyHistory?.values || [];
    // FRED VIX history is intermittently 403'd by Akamai; the term-structure
    // values (4 points) are too few to correlate, so leave VIX empty when no
    // longer series is available — the dashboard will drop it from the matrix.
    const vixHist = derivCtx?.data?.fredVixHistory?.values || [];
    return {
      spx:     { history: findReturns('SPY') },
      tenYear: { history: dgs10 },
      vix:     { history: vixHist },
      btc:     { history: findReturns('BTC-USD') },
      gold:    { history: findReturns('GLD') },
      dxy:     { history: dxyHist },
    };
  }, [sentimentCtx, fxCtx, bondsCtx, derivCtx]);

  if (!centralData) return <MarketSkeleton />;
  const props = getAlertsProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    // The "Severity / Rule Health" bento panel inside AlertsDashboard
    // already wraps <AlertsSidebar>, so the loose left-column copy is gone.
    <div className="alerts-market">
      <div className="alerts-market-main">
        {props.alerts.length > 0 && (
          <span className="alerts-alert-count">
            {props.alerts.length} alert{props.alerts.length !== 1 ? 's' : ''} triggered
          </span>
        )}
        <AlertsDashboard
          convert={convert}
          currentSymbol={currentSymbol}
          alerts={props.alerts}
          rules={props.rules}
          isLive={props.isLive}
          fetchedOn={props.fetchedOn}
          isCurrent={props.isCurrent}
          fetchLog={props.fetchLog}
          lastUpdated={props.lastUpdated}
          error={props.error}
          onToggleRule={props.refetch}
          correlationData={correlationData}
        />
        <DataFooter source="Multi-market (6 endpoints)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
      </div>
    </div>
  );
}

export default React.memo(AlertsMarket);
