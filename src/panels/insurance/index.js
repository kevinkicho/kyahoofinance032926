import p_kpi from './kpi.jsx';
import p_hyoas from './hyoas.jsx';
import p_catloss from './catloss.jsx';
import p_crhist from './crhist.jsx';
import p_crline from './crline.jsx';
import p_reinsrates from './reinsrates.jsx';
import p_reserves from './reserves.jsx';
import p_catbonds from './catbonds.jsx';
import p_etfs from './etfs.jsx';
import p_catastrophes from './catastrophes.jsx';
import p_ins_penetration from './ins-penetration.jsx';
import p_wb_ins_penetration from './wb-ins-penetration.jsx';
import p_combined_ratios from './combined-ratios.jsx';
import p_fema_disasters from './fema-disasters.jsx';
import p_usgs_earthquakes from './usgs-earthquakes.jsx';
import p_cat_exposure from './cat-exposure.jsx';
import p_usgs_minerals from './usgs-minerals.jsx';
import p_ecb_supervisory from './ecb-supervisory.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const INSURANCE_PANELS = [
  p_kpi,
  p_hyoas,
  p_catloss,
  p_crhist,
  p_crline,
  p_reinsrates,
  p_reserves,
  p_catbonds,
  p_etfs,
  p_catastrophes,
  p_ins_penetration,
  p_wb_ins_penetration,
  p_combined_ratios,
  p_fema_disasters,
  p_usgs_earthquakes,
  p_cat_exposure,
  p_usgs_minerals,
  p_ecb_supervisory
];

export const INSURANCE_PANEL_BY_ID = Object.fromEntries(
  INSURANCE_PANELS.map((p) => [p.panelId, p]),
);
