import { definePanel } from '../definePanel';
import YieldCurve from '../../markets/bonds/components/YieldCurve';

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
    const yc = ctx?.bonds?.yieldCurveData || {};
    const n = Object.keys(yc).filter((k) => yc[k] && Object.values(yc[k]).some((v) => v != null)).length;
    return `${n} markets · US multi-tenor + global 10Y`;
  },
  isLive: (ctx) => {
    const yc = ctx?.bonds?.yieldCurveData || {};
    return Object.keys(yc).some((k) => yc[k] && Object.values(yc[k]).some((v) => v != null));
  },
  Body,
});
