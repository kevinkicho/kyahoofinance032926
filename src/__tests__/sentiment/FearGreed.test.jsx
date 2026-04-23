import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FearGreed from '../../markets/sentiment/components/FearGreed';

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

const mockFearGreedData = {
  score: 28,
  label: 'Fear',
  altmeScore: 25,
  history: [
    { date: '2026-01-01', value: 45 },
    { date: '2026-01-02', value: 42 },
    { date: '2026-01-03', value: 35 },
    { date: '2026-01-04', value: 28 },
  ],
  indicators: [
    { name: 'VIX', value: 18.5, percentile: 15, signal: 'fear' },
    { name: 'HY Spread', value: 385, percentile: 72, signal: 'fear' },
    { name: 'SPY Momentum', value: -2.1, percentile: 22, signal: 'fear' },
  ],
};

const mockConsumerCredit = {
  dates: ['2025-10-01', '2025-11-01', '2025-12-01', '2026-01-01'],
  values: [4703, 4721, 4745, 4768],
};

describe('FearGreed', () => {
  it('renders null when no data provided', () => {
    const { container } = render(<FearGreed fearGreedData={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders panel title and subtitle', () => {
    render(<FearGreed fearGreedData={mockFearGreedData} />);
    expect(screen.getByText('Fear & Greed')).toBeInTheDocument();
  });

  it('renders the score label', () => {
    render(<FearGreed fearGreedData={mockFearGreedData} />);
    expect(screen.getByText('Fear')).toBeInTheDocument();
  });

  it('renders altmeScore when provided', () => {
    render(<FearGreed fearGreedData={mockFearGreedData} />);
    expect(screen.getByText('Alt.me raw: 25')).toBeInTheDocument();
  });

  it('renders history chart title', () => {
    render(<FearGreed fearGreedData={mockFearGreedData} />);
    expect(screen.getByText('252-Day Fear & Greed History')).toBeInTheDocument();
  });

  it('renders indicators list', () => {
    render(<FearGreed fearGreedData={mockFearGreedData} />);
    expect(screen.getByText('VIX')).toBeInTheDocument();
    expect(screen.getByText('HY Spread')).toBeInTheDocument();
    expect(screen.getByText('SPY Momentum')).toBeInTheDocument();
  });

  it('renders consumer credit section when provided', () => {
    render(<FearGreed fearGreedData={mockFearGreedData} consumerCredit={mockConsumerCredit} />);
    expect(screen.getByText('Consumer Credit')).toBeInTheDocument();
  });
});