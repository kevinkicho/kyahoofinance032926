import { describe, it, expect } from 'vitest';
import {
  buildSpreadHistoryOption,
  buildFedBalanceOption,
  buildM2Option,
  buildDebtToGdpOption,
} from '../../markets/bonds/components/bondsChartOptions';

const colors = {
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  cardBg: '#1e293b',
};

describe('bondsChartOptions', () => {
  it('returns null for empty series', () => {
    expect(buildSpreadHistoryOption(null, colors)).toBe(null);
    expect(buildFedBalanceOption({}, colors)).toBe(null);
    expect(buildM2Option({ dates: [] }, colors)).toBe(null);
    expect(buildDebtToGdpOption(null, colors)).toBe(null);
  });

  it('builds fed balance option with dates', () => {
    const opt = buildFedBalanceOption(
      { dates: ['2024-01', '2024-02'], values: [7.1, 7.2] },
      colors,
      '$',
    );
    expect(opt.series[0].data).toEqual([7.1, 7.2]);
    expect(opt.xAxis.data).toHaveLength(2);
  });

  it('builds spread history with three series', () => {
    const opt = buildSpreadHistoryOption(
      {
        dates: ['a', 'b'],
        t10y2y: [0.1, 0.2],
        t10y3m: [-0.1, 0],
        t5y30y: [0.5, 0.4],
      },
      colors,
    );
    expect(opt.series).toHaveLength(3);
  });
});
