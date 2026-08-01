import p_kpi from './kpi.jsx';
import p_sidebar from './sidebar.jsx';
import p_movers from './movers.jsx';
import p_dxy from './dxy.jsx';
import p_cot from './cot.jsx';
import p_corr from './corr.jsx';
import p_reer from './reer.jsx';
import p_ratediff from './ratediff.jsx';
import p_carry from './carry.jsx';
import p_rate_dashboard from './rate-dashboard.jsx';
import p_imf_cofer from './imf-cofer.jsx';
import p_treasury_tic from './treasury-tic.jsx';
import p_bis_reer from './bis-reer.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const FX_PANELS = [
  p_kpi,
  p_sidebar,
  p_movers,
  p_dxy,
  p_cot,
  p_corr,
  p_reer,
  p_ratediff,
  p_carry,
  p_rate_dashboard,
  p_imf_cofer,
  p_treasury_tic,
  p_bis_reer
];

export const FX_PANEL_BY_ID = Object.fromEntries(
  FX_PANELS.map((p) => [p.panelId, p]),
);
