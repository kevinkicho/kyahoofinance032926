import { definePanel } from '../definePanel';
import BreakevenMonitor from '../../markets/bonds/components/BreakevenMonitor';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  if (!d.breakevensData) {
    return <div className="bonds-empty">No breakeven data</div>;
  }
  return <BreakevenMonitor breakevensData={d.breakevensData} lastUpdated={d.lastUpdated} />;
}

export default definePanel({
  key: 'bonds:breakevens',
  panelId: 'breakevens',
  markets: ['bonds'],
  title: 'Breakeven Inflation',
  source: 'FRED DFII5 / DFII10',
  contentClassName: 'bonds-panel-content',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/breakevens.js',
  isLive: (ctx) => !!ctx?.bonds?.breakevensData?.current?.be5y,
  isDisabled: (ctx) => !ctx?.bonds?.breakevensData,
  Body,
});
