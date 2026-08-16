import p_sidebar from './sidebar.jsx';
import p_prices from './prices.jsx';
import p_futures from './futures.jsx';
import p_sector from './sector.jsx';
import p_supply from './supply.jsx';
import p_wti_brent from './wti-brent.jsx';
import p_cot from './cot.jsx';
import p_comfx from './comfx.jsx';
import p_usda_ag from './usda-ag.jsx';
import p_eia_petrol from './eia-petrol.jsx';
import p_physical_pressure from './physical-pressure.jsx';
import p_materials_grid from './materials-grid.jsx';
import p_criticality from './criticality.jsx';
import p_battery_chain from './battery-chain.jsx';
import p_precious_complex from './precious-complex.jsx';
import p_regime from './regime.jsx';
import p_energy_stack from './energy-stack.jsx';
import p_curve_board from './curve-board.jsx';
import p_material_detail from './material-detail.jsx';
import p_exposure_matrix from './exposure-matrix.jsx';
import p_fao_prices from './fao-prices.jsx';
import p_us_trade from './us-trade.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const COMMODITIES_PANELS = [
  p_sidebar,
  p_prices,
  p_futures,
  p_sector,
  p_supply,
  p_wti_brent,
  p_cot,
  p_comfx,
  p_usda_ag,
  p_eia_petrol,
  p_physical_pressure,
  p_materials_grid,
  p_criticality,
  p_battery_chain,
  p_precious_complex,
  p_regime,
  p_energy_stack,
  p_curve_board,
  p_material_detail,
  p_exposure_matrix,
  p_fao_prices,
  p_us_trade
];

export const COMMODITIES_PANEL_BY_ID = Object.fromEntries(
  COMMODITIES_PANELS.map((p) => [p.panelId, p]),
);
