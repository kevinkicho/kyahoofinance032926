import { definePanel } from '../definePanel';
import CpiComponents from '../../markets/bonds/components/CpiComponents';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  return <CpiComponents cpiComponents={d.cpiComponents} lastUpdated={d.lastUpdated} />;
}

export default definePanel({
  key: 'bonds:cpi',
  panelId: 'cpi',
  markets: ['bonds'],
  title: 'CPI Components (YoY)',
  source: 'FRED CPIAUCSL / CPILFESL',
  contentClassName: 'bonds-panel-content',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/cpi.js',
  isLive: (ctx) => !!ctx?.bonds?.cpiComponents?.dates?.length,
  Body,
});
