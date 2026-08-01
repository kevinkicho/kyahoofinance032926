import p_kpi from './kpi.jsx';
import p_key_metrics from './key-metrics.jsx';
import p_credit_spreads from './credit-spreads.jsx';
import p_spread_summary from './spread-summary.jsx';
import p_em_spread from './em-spread.jsx';
import p_em_yields from './em-yields.jsx';
import p_cp_rates from './cp-rates.jsx';
import p_clo_tranches from './clo-tranches.jsx';
import p_default_rates from './default-rates.jsx';
import p_delinquency from './delinquency.jsx';
import p_bank_sector from './bank-sector.jsx';
import p_credit_quality from './credit-quality.jsx';
import p_muni_market from './muni-market.jsx';
import p_bank_stress from './bank-stress.jsx';
import p_ted_spread from './ted-spread.jsx';
import p_wb_debt from './wb-debt.jsx';
import p_bis_total_credit from './bis-total-credit.jsx';
import p_treasury_credit_holdings from './treasury-credit-holdings.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const CREDIT_PANELS = [
  p_kpi,
  p_key_metrics,
  p_credit_spreads,
  p_spread_summary,
  p_em_spread,
  p_em_yields,
  p_cp_rates,
  p_clo_tranches,
  p_default_rates,
  p_delinquency,
  p_bank_sector,
  p_credit_quality,
  p_muni_market,
  p_bank_stress,
  p_ted_spread,
  p_wb_debt,
  p_bis_total_credit,
  p_treasury_credit_holdings
];

export const CREDIT_PANEL_BY_ID = Object.fromEntries(
  CREDIT_PANELS.map((p) => [p.panelId, p]),
);
