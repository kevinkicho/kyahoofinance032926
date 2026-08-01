import p_prices from './prices.jsx';
import p_consumption from './consumption.jsx';
import p_trends from './trends.jsx';
import p_co2 from './co2.jsx';
import p_petroleum from './petroleum.jsx';
import p_natural_gas from './natural-gas.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const EIA_PANELS = [
  p_prices,
  p_consumption,
  p_trends,
  p_co2,
  p_petroleum,
  p_natural_gas
];

export const EIA_PANEL_BY_ID = Object.fromEntries(
  EIA_PANELS.map((p) => [p.panelId, p]),
);
