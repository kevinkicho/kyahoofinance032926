import p_kpi from './kpi.jsx';
import p_sidebar from './sidebar.jsx';
import p_scorecard from './scorecard.jsx';
import p_gdp from './gdp.jsx';
import p_cpi from './cpi.jsx';
import p_rates from './rates.jsx';
import p_debt from './debt.jsx';
import p_activity from './activity.jsx';
import p_cli from './cli.jsx';
import p_imf_reserves from './imf-reserves.jsx';
import p_imf_cofer from './imf-cofer.jsx';
import p_wb_trade from './wb-trade.jsx';
import p_wb_dev from './wb-dev.jsx';
import p_ecb_eur from './ecb-eur.jsx';
import p_tga_balance from './tga-balance.jsx';
import p_gdpnow from './gdpnow.jsx';
import p_fomc_sep from './fomc-sep.jsx';
import p_cleveland from './cleveland.jsx';
import p_bea_accounts from './bea-accounts.jsx';
import p_eurostat from './eurostat.jsx';
import p_oecd_direct from './oecd-direct.jsx';
import p_bea_income from './bea-income.jsx';
import p_global_liquidity from './global-liquidity.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const GLOBALMACRO_PANELS = [
  p_kpi,
  p_sidebar,
  p_scorecard,
  p_gdp,
  p_cpi,
  p_rates,
  p_debt,
  p_activity,
  p_cli,
  p_imf_reserves,
  p_imf_cofer,
  p_wb_trade,
  p_wb_dev,
  p_ecb_eur,
  p_tga_balance,
  p_gdpnow,
  p_fomc_sep,
  p_cleveland,
  p_bea_accounts,
  p_eurostat,
  p_oecd_direct,
  p_bea_income,
  p_global_liquidity
];

export const GLOBALMACRO_PANEL_BY_ID = Object.fromEntries(
  GLOBALMACRO_PANELS.map((p) => [p.panelId, p]),
);
