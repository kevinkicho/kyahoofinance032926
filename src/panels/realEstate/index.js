import p_metrics from './metrics.jsx';
import p_shiller from './shiller.jsx';
import p_reitetf from './reitetf.jsx';
import p_reitperf from './reitperf.jsx';
import p_foreclosure from './foreclosure.jsx';
import p_mba from './mba.jsx';
import p_cre from './cre.jsx';
import p_caprate from './caprate.jsx';
import p_supply from './supply.jsx';
import p_hud_afford from './hud-afford.jsx';
import p_afford_stack from './afford-stack.jsx';
import p_census_housing from './census-housing.jsx';
import p_census_trade from './census-trade.jsx';
import p_census_trends_housing from './census-trends-housing.jsx';
import p_census_trends_trade from './census-trends-trade.jsx';
import p_fhfa_hpi from './fhfa-hpi.jsx';
import p_bis_property_prices from './bis-property-prices.jsx';
import p_metro_case_shiller from './metro-case-shiller.jsx';
import p_hud_affordability_by_metro from './hud-affordability-by-metro.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const REALESTATE_PANELS = [
  p_metrics,
  p_shiller,
  p_reitetf,
  p_reitperf,
  p_foreclosure,
  p_mba,
  p_cre,
  p_caprate,
  p_supply,
  p_hud_afford,
  p_afford_stack,
  p_census_housing,
  p_census_trade,
  p_census_trends_housing,
  p_census_trends_trade,
  p_fhfa_hpi,
  p_bis_property_prices,
  p_metro_case_shiller,
  p_hud_affordability_by_metro
];

export const REALESTATE_PANEL_BY_ID = Object.fromEntries(
  REALESTATE_PANELS.map((p) => [p.panelId, p]),
);
