import p_sidebar from './sidebar.jsx';
import p_key_metrics from './key-metrics.jsx';
import p_fear_greed from './fear-greed.jsx';
import p_fsi from './fsi.jsx';
import p_cftc from './cftc.jsx';
import p_cross_asset from './cross-asset.jsx';
import p_risk_dashboard from './risk-dashboard.jsx';
import p_leverage from './leverage.jsx';
import p_news_sentiment from './news-sentiment.jsx';
import p_fed_risk_mood from './fed-risk-mood.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const SENTIMENT_PANELS = [
  p_sidebar,
  p_key_metrics,
  p_fear_greed,
  p_fsi,
  p_cftc,
  p_cross_asset,
  p_risk_dashboard,
  p_leverage,
  p_news_sentiment,
  p_fed_risk_mood
];

export const SENTIMENT_PANEL_BY_ID = Object.fromEntries(
  SENTIMENT_PANELS.map((p) => [p.panelId, p]),
);
