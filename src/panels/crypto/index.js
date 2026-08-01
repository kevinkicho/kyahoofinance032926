import p_sidebar from './sidebar.jsx';
import p_top_cryptos from './top-cryptos.jsx';
import p_fear_greed from './fear-greed.jsx';
import p_funding from './funding.jsx';
import p_defi_tvl from './defi-tvl.jsx';
import p_exchanges from './exchanges.jsx';
import p_onchain from './onchain.jsx';
import p_onchain_chart from './onchain-chart.jsx';
import p_stablecoin_composition from './stablecoin-composition.jsx';
import p_defi_tvl_trend from './defi-tvl-trend.jsx';
import p_btc_onchain from './btc-onchain.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const CRYPTO_PANELS = [
  p_sidebar,
  p_top_cryptos,
  p_fear_greed,
  p_funding,
  p_defi_tvl,
  p_exchanges,
  p_onchain,
  p_onchain_chart,
  p_stablecoin_composition,
  p_defi_tvl_trend,
  p_btc_onchain
];

export const CRYPTO_PANEL_BY_ID = Object.fromEntries(
  CRYPTO_PANELS.map((p) => [p.panelId, p]),
);
