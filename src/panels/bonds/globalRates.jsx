import { definePanel } from '../definePanel';
import { CentralBankRatesPanel } from '../../markets/bonds/components/MacroAndRatesPanels';
import { hasGlobalCentralBankRates } from '../../markets/bonds/components/BondsLiveChips';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  return (
    <CentralBankRatesPanel
      rates={d.macroData?.centralBankRates}
      meta={d.macroData?.centralBankMeta}
      ecbRate={ctx?.ecb?.data?.policyRates?.mainRefinancing?.value}
    />
  );
}

export default definePanel({
  key: 'bonds:global-rates',
  panelId: 'global-rates',
  markets: ['bonds', 'globalMacro'],
  title: 'Global Central Bank Policy Rates',
  source: 'FRED / ECB',
  contentClassName: 'bonds-panel-content mi-host',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/globalRates.js',
  getSubtitle: () => 'Overnight / policy rates · FRED + ECB',
  isLive: (ctx) => hasGlobalCentralBankRates(ctx?.bonds?.macroData?.centralBankRates, ctx?.ecb?.data?.policyRates?.mainRefinancing?.value),
  Body,
});
