import p_kpi from './kpi.jsx';
import p_economic from './economic.jsx';
import p_sidebar from './sidebar.jsx';
import p_cb_rates from './cb-rates.jsx';
import p_cb_timeline from './cb-timeline.jsx';
import p_earnings from './earnings.jsx';
import p_key_data from './key-data.jsx';
import p_treasury from './treasury.jsx';
import p_options from './options.jsx';
import p_release_impact from './release-impact.jsx';
import p_catalyst_wall from './catalyst-wall.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const CALENDAR_PANELS = [
  p_kpi,
  p_economic,
  p_sidebar,
  p_cb_rates,
  p_cb_timeline,
  p_earnings,
  p_key_data,
  p_treasury,
  p_options,
  p_release_impact,
  p_catalyst_wall
];

export const CALENDAR_PANEL_BY_ID = Object.fromEntries(
  CALENDAR_PANELS.map((p) => [p.panelId, p]),
);
