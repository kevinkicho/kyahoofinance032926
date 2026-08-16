import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrossAssetReturns from '../../markets/sentiment/components/CrossAssetReturns';

vi.mock('../../hub/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff',
      textMuted: '#94a3b8',
      textDim: '#64748b',
      textSecondary: '#94a3b8',
      cardBg: '#1e293b',
      tooltipBg: '#1e293b',
      tooltipBorder: '#334155',
    },
  }),
}));

const mockReturns = {
  asOf: '2026-08-16',
  assets: [
    { ticker: 'SPY', label: 'S&P 500', category: 'US Equity', ret1d: 0.4, ret1w: 1.2, ret1m: 3.1, ret3m: 6.4 },
    { ticker: 'TLT', label: '20Y Treasury', category: 'Fixed Income', ret1d: -0.2, ret1w: 0.3, ret1m: -1.1, ret3m: 2.0 },
  ],
};

describe('CrossAssetReturns', () => {
  it('renders null when no data provided', () => {
    const { container } = render(<CrossAssetReturns returnsData={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('survives empty-then-data remount without a hooks-order crash', () => {
    const { rerender } = render(<CrossAssetReturns returnsData={null} />);
    expect(() => rerender(<CrossAssetReturns returnsData={mockReturns} />)).not.toThrow();
    expect(screen.getByText('Cross-Asset Returns')).toBeInTheDocument();
  });
});
