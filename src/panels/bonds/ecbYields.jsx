import { definePanel } from '../definePanel';
import { EcbPolicyRatesPanel } from '../../markets/bonds/components/MacroAndRatesPanels';
import { hasEcbPolicyRatesContent } from '../../markets/bonds/components/BondsLiveChips';

function Body({ ctx }) {
  return <EcbPolicyRatesPanel data={ctx?.ecb?.data} />;
}

export default definePanel({
  key: 'bonds:ecb-yields',
  panelId: 'ecb-yields',
  markets: ['bonds', 'globalMacro'],
  title: 'ECB Policy Rates',
  source: 'ECB SDW',
  contentClassName: 'bonds-panel-content ecb-host',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/ecbYields.js',
  getSubtitle: () => 'Key rates · €STR · EURIBOR · M3/HICP',
  isLive: (ctx) => hasEcbPolicyRatesContent(ctx?.ecb?.data),
  Body,
});
