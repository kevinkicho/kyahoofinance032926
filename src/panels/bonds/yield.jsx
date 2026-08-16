import { definePanel } from '../definePanel';
import YieldCurve from '../../markets/bonds/components/YieldCurve';
import { hasYieldCurveContent, yieldCurveCountries } from '../../markets/bonds/components/BondsLiveChips';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  return (
    <YieldCurve
      yieldCurveData={d.yieldCurveData}
      spreadIndicators={d.spreadIndicators}
      fredYieldHistory={d.fredYieldHistory}
      yieldHistory={d.yieldHistory}
      lastUpdated={d.lastUpdated}
    />
  );
}

export default definePanel({
  key: 'bonds:yield',
  panelId: 'yield',
  markets: ['bonds'],
  title: 'Yield Curve',
  source: 'FRED',
  contentClassName: 'bonds-panel-content yc-host',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/yield.js',
  getSubtitle: (ctx) => {
    const n = yieldCurveCountries(ctx?.bonds?.yieldCurveData).length;
    return `${n} markets · US multi-tenor + global 10Y`;
  },
  isLive: (ctx) => hasYieldCurveContent(ctx?.bonds?.yieldCurveData),
  Body,
});
