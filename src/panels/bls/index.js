import p_kpi from './kpi.jsx';
import p_trends_top from './trends-top.jsx';
import p_trends_bottom from './trends-bottom.jsx';
import p_jolts from './jolts.jsx';
import p_productivity from './productivity.jsx';
import p_cpi_components from './cpi-components.jsx';
import p_ppi_by_industry from './ppi-by-industry.jsx';
import p_eci from './eci.jsx';
import p_unemployment_duration from './unemployment-duration.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const BLS_PANELS = [
  p_kpi,
  p_trends_top,
  p_trends_bottom,
  p_jolts,
  p_productivity,
  p_cpi_components,
  p_ppi_by_industry,
  p_eci,
  p_unemployment_duration
];

export const BLS_PANEL_BY_ID = Object.fromEntries(
  BLS_PANELS.map((p) => [p.panelId, p]),
);
