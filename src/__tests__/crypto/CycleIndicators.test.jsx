import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CycleIndicators from '../../markets/crypto/components/CycleIndicators';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

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

const mockFearGreed = {
  value: 28,
  history: [45, 42, 35, 28],
  correlations: [{ asset: 'QQQ', corr30d: 0.62, corr90d: 0.41 }],
};

describe('CycleIndicators', () => {
  it('renders null when no data provided', () => {
    const { container } = render(<CycleIndicators fearGreedData={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('survives empty-then-data remount without a hooks-order crash', () => {
    const { rerender } = render(<CycleIndicators fearGreedData={null} />);
    expect(() => rerender(<CycleIndicators fearGreedData={mockFearGreed} />)).not.toThrow();
    expect(screen.getByText('Cycle Indicators')).toBeInTheDocument();
  });
});
