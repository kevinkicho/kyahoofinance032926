/**
 * Independent bonds panels — imported by BondsDashboard (composition only).
 * Hand-written Bodies for core charts; bridge modules use ctx.__render during migration.
 */
import yieldPanel from './yield.jsx';
import creditPanel from './credit.jsx';
import realYieldPanel from './realYield.jsx';
import breakevensPanel from './breakevens.jsx';
import durationPanel from './duration.jsx';
import cpiPanel from './cpi.jsx';
import macroPanel from './macro.jsx';
import ecbYieldsPanel from './ecbYields.jsx';
import globalRatesPanel from './globalRates.jsx';
import kpiPanel from './kpi.jsx';
import metricsPanel from './metrics.jsx';
import ratingsPanel from './ratings.jsx';
import curvespreadsPanel from './curvespreads.jsx';
import fedPanel from './fed.jsx';
import m2Panel from './m2.jsx';
import debtgdpPanel from './debtgdp.jsx';
import foreignHoldersPanel from './foreign-holders.jsx';
import moneyMarketPanel from './money-market.jsx';
import auctionsPanel from './auctions.jsx';
import treasuryCostPanel from './treasury-cost.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const BONDS_PANELS = [
  kpiPanel,
  yieldPanel,
  metricsPanel,
  creditPanel,
  realYieldPanel,
  ratingsPanel,
  curvespreadsPanel,
  fedPanel,
  m2Panel,
  cpiPanel,
  debtgdpPanel,
  breakevensPanel,
  durationPanel,
  macroPanel,
  foreignHoldersPanel,
  moneyMarketPanel,
  auctionsPanel,
  ecbYieldsPanel,
  globalRatesPanel,
  treasuryCostPanel,
];

export const BONDS_PANEL_BY_ID = Object.fromEntries(
  BONDS_PANELS.map((p) => [p.panelId, p]),
);
