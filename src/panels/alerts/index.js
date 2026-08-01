import p_kpi from './kpi.jsx';
import p_active_alerts from './active-alerts.jsx';
import p_alert_rules from './alert-rules.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const ALERTS_PANELS = [
  p_kpi,
  p_active_alerts,
  p_alert_rules
];

export const ALERTS_PANEL_BY_ID = Object.fromEntries(
  ALERTS_PANELS.map((p) => [p.panelId, p]),
);
