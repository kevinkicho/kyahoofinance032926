import p_kpi from './kpi.jsx';
import p_my_tickers from './my-tickers.jsx';
import p_my_metrics from './my-metrics.jsx';
import p_cross_alerts from './cross-alerts.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const WATCHLIST_PANELS = [
  p_kpi,
  p_my_tickers,
  p_my_metrics,
  p_cross_alerts
];

export const WATCHLIST_PANEL_BY_ID = Object.fromEntries(
  WATCHLIST_PANELS.map((p) => [p.panelId, p]),
);
