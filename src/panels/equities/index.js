import p_kpi from './kpi.jsx';
import p_heatmap from './heatmap.jsx';
import p_sidebar from './sidebar.jsx';
import p_portfolio from './portfolio.jsx';
import p_universe_updates from './universe-updates.jsx';
import p_sec_fundamentals from './sec-fundamentals.jsx';
import p_sec_filings from './sec-filings.jsx';
import p_bea_corporate_profits from './bea-corporate-profits.jsx';
import p_wb_market_cap from './wb-market-cap.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const EQUITIES_PANELS = [
  p_kpi,
  p_heatmap,
  p_sidebar,
  p_portfolio,
  p_universe_updates,
  p_sec_fundamentals,
  p_sec_filings,
  p_bea_corporate_profits,
  p_wb_market_cap
];

export const EQUITIES_PANEL_BY_ID = Object.fromEntries(
  EQUITIES_PANELS.map((p) => [p.panelId, p]),
);
