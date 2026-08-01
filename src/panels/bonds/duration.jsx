import { definePanel } from '../definePanel';
import DurationLadder from '../../markets/bonds/components/DurationLadder';

function Body({ ctx }) {
  const d = ctx?.bonds || {};
  return (
    <DurationLadder
      durationLadderData={d.durationLadderData}
      durationLadderMeta={d.durationLadderMeta}
      treasuryRates={d.treasuryRates}
      fedFundsFutures={d.fedFundsFutures}
    />
  );
}

export default definePanel({
  key: 'bonds:duration',
  panelId: 'duration',
  markets: ['bonds'],
  title: 'Duration Ladder',
  source: 'Treasury Fiscal Data / CME ZQ',
  contentClassName: 'bonds-panel-content dl-host',
  className: 'bonds-bento-card',
  modulePath: 'src/panels/bonds/duration.js',
  getSubtitle: (ctx) => {
    const asOf = ctx?.bonds?.durationLadderMeta?.asOf;
    if (!asOf) return 'US Treasury marketable debt by maturity';
    try {
      const label = new Date(`${asOf}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `US Treasury marketable debt by maturity (as of ${label})`;
    } catch {
      return 'US Treasury marketable debt by maturity';
    }
  },
  isLive: (ctx) => {
    const d = ctx?.bonds || {};
    return !!(d.durationLadderMeta || (d.fedFundsFutures && Object.keys(d.fedFundsFutures).length > 1));
  },
  Body,
});
