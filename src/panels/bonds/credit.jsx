import { definePanel } from '../definePanel';
import SpreadMonitor from '../../markets/bonds/components/SpreadMonitor';
import { hasCreditSpreadContent } from '../../markets/bonds/components/BondsLiveChips';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  if (!hasCreditSpreadContent(d.spreadData)) {
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
  isLive: (ctx) => hasCreditSpreadContent(ctx?.bonds?.spreadData),
  Body,
});
