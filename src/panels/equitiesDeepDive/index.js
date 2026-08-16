import p_kpi from './kpi.jsx';
import p_sidebar from './sidebar.jsx';
import p_valuation from './valuation.jsx';
import p_etf from './etf.jsx';
import p_factor_favor from './factor-favor.jsx';
import p_sector_beat from './sector-beat.jsx';
import p_shorted from './shorted.jsx';
import p_scores from './scores.jsx';
import p_factor_rankings from './factor-rankings.jsx';
import p_earnings from './earnings.jsx';
import p_institutions from './institutions.jsx';
import p_insider from './insider.jsx';
import p_earnings_quality from './earnings-quality.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const EQUITIESDEEPDIVE_PANELS = [
  p_kpi,
  p_sidebar,
  p_valuation,
  p_etf,
  p_factor_favor,
  p_sector_beat,
  p_shorted,
  p_scores,
  p_factor_rankings,
  p_earnings,
  p_institutions,
  p_insider,
  p_earnings_quality
];

export const EQUITIESDEEPDIVE_PANEL_BY_ID = Object.fromEntries(
  EQUITIESDEEPDIVE_PANELS.map((p) => [p.panelId, p]),
);
