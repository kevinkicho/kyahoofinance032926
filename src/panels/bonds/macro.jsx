import { definePanel } from '../definePanel';
import { MacroIndicatorsPanel } from '../../markets/bonds/components/MacroAndRatesPanels';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  return (
    <MacroIndicatorsPanel
      macroData={d.macroData}
      nationalDebt={d.nationalDebt}
      debtToGdpHistory={d.debtToGdpHistory}
      lastUpdated={d.lastUpdated}
      convertAndFormat={d.convertAndFormat}
    />
  );
}

export default definePanel({
  key: 'bonds:macro',
  panelId: 'macro',
  markets: ['bonds'],
  title: 'Macro Indicators',
  source: 'FRED',
  contentClassName: 'bonds-panel-content mi-host',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/macro.js',
  getSubtitle: () => 'Fed balance sheet · money · labor · growth · policy rates',
  isLive: (ctx) => {
    const m = ctx?.bonds?.macroData;
    return !!(m && Object.keys(m).length > 0);
  },
  Body,
});
