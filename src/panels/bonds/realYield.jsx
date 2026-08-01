import { definePanel } from '../definePanel';
import RealYields from '../../markets/bonds/components/RealYields';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  return <RealYields realYieldHistory={d.realYieldHistory} lastUpdated={d.lastUpdated} />;
}

export default definePanel({
  key: 'bonds:realYield',
  panelId: 'realYield',
  markets: ['bonds'],
  title: 'TIPS Real Yields',
  source: 'FRED DFII5 / DFII10',
  contentClassName: 'bonds-panel-content',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/realYield.js',
  isLive: (ctx) => !!ctx?.bonds?.realYieldHistory?.dates?.length,
  Body,
});
