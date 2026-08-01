import p_kpi from './kpi.jsx';
import p_metrics from './metrics.jsx';
import p_vixterm from './vixterm.jsx';
import p_vix1y from './vix1y.jsx';
import p_skew from './skew.jsx';
import p_volsurf from './volsurf.jsx';
import p_flow from './flow.jsx';
import p_gamma from './gamma.jsx';
import p_volprem from './volprem.jsx';
import p_cftc_tff from './cftc-tff.jsx';
import p_bis_otc from './bis-otc.jsx';
import p_ecb_derivatives from './ecb-derivatives.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const DERIVATIVES_PANELS = [
  p_kpi,
  p_metrics,
  p_vixterm,
  p_vix1y,
  p_skew,
  p_volsurf,
  p_flow,
  p_gamma,
  p_volprem,
  p_cftc_tff,
  p_bis_otc,
  p_ecb_derivatives
];

export const DERIVATIVES_PANEL_BY_ID = Object.fromEntries(
  DERIVATIVES_PANELS.map((p) => [p.panelId, p]),
);
