import { definePanel } from '../definePanel';
import SpreadMonitor from '../../markets/bonds/components/SpreadMonitor';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  if (!(d.spreadData?.dates?.length || d.spreadData?.current)) {
    return <div className="bonds-empty">No spread data available</div>;
  }
  return (
    <SpreadMonitor
      spreadData={d.spreadData}
      mortgageSpread={d.mortgageSpread}
      lastUpdated={d.lastUpdated}
    />
  );
}

export default definePanel({
  key: 'bonds:credit',
  panelId: 'credit',
  markets: ['bonds'],
  title: 'Credit Spreads',
  source: 'FRED ICE BofA',
  contentClassName: 'bonds-panel-content',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/credit.js',
  getSubtitle: () => 'IG · HY · EM · BBB',
  isLive: (ctx) => {
    const s = ctx?.bonds?.spreadData;
    return !!(s?.dates?.length || s?.current?.hySpread != null);
  },
  Body,
});
