import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CftcPositioning from '../../markets/sentiment/components/CftcPositioning';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

vi.mock('../../hub/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff',
      textMuted: '#94a3b8',
      textDim: '#64748b',
      textSecondary: '#94a3b8',
      bg: '#0f172a',
      cardBg: '#1e293b',
      tooltipBg: '#1e293b',
      tooltipBorder: '#334155',
    },
  }),
}));

const mockCftc = {
  asOf: '2026-08-12',
  currencies: [{ code: 'JPY', name: 'Yen', netPct: 12.4, longK: 80, shortK: 40, oiK: 200 }],
  equities: [],
  rates: [],
  commodities: [],
};

describe('CftcPositioning', () => {
  it('renders null when no data provided', () => {
    const { container } = render(<CftcPositioning cftcData={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('survives empty-then-data remount without a hooks-order crash', () => {
    const { rerender } = render(<CftcPositioning cftcData={null} />);
    expect(() => rerender(<CftcPositioning cftcData={mockCftc} />)).not.toThrow();
    expect(screen.getByText('Most Long')).toBeInTheDocument();
  });

  it('does not remount-crash when leftover CFTC bucket bags are isLive-only', () => {
    const leftover = {
      ...mockCftc,
      isLive: true,
      equities: { isLive: true },
      rates: { isLive: true },
      commodities: { isLive: true },
    };
    expect(() => render(<CftcPositioning cftcData={leftover} />)).not.toThrow();
    expect(screen.getByText('Most Long')).toBeInTheDocument();
    expect(screen.getByText('JPY +12.4%')).toBeInTheDocument();
  });
});
