import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FuturesCurve from '../../markets/commodities/components/FuturesCurve';

vi.mock('../../hub/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    colors: {
      text: '#fff',
      textSecondary: '#94a3b8',
      textDim: '#64748b',
      textMuted: '#475569',
      tooltipBg: '#1e293b',
      tooltipBorder: '#334155',
      cardBg: '#1e293b',
    },
  })),
}));

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('FuturesCurve', () => {
  const mockFuturesCurveData = {
    labels: ['May25', 'Jun25', 'Jul25', 'Aug25', 'Sep25', 'Oct25'],
    prices: [78.50, 78.20, 77.90, 77.65, 77.40, 77.15],
    spotPrice: 78.75,
    unit: 'USD/bbl',
  };

  const mockGoldFuturesCurve = {
    labels: ['May25', 'Jun25', 'Jul25', 'Aug25', 'Sep25', 'Oct25'],
    prices: [3250.0, 3260.5, 3270.0, 3278.5, 3285.0, 3295.0],
    spotPrice: 3245.0,
    unit: 'USD/oz',
  };

  const mockFredCommodities = {
    dollarIndex: {
      dates: ['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01', '2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01'],
      values: [102.5, 103.2, 101.8, 102.0, 103.5, 104.1, 103.8, 102.5, 101.2, 100.8, 101.5, 102.2],
    },
    wtiHistory: {
      dates: ['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01', '2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01'],
      values: [75.0, 72.5, 78.0, 80.5, 79.2, 81.0, 78.5, 76.2, 72.8, 70.5, 71.2, 73.8],
    },
  };

  const mockSeasonalPatterns = {
    CL: [2.1, 1.8, -0.5, 3.2, 4.1, 2.8, -1.2, -2.5, 1.5, 3.8, 4.5, 2.0],
    GC: [5.2, 3.1, 1.2, -0.8, -1.5, 2.1, 3.5, 4.2, 2.8, 1.5, 3.2, 4.8],
    ZC: [-2.1, 1.5, 3.2, 5.1, 2.8, -1.2, -3.5, 1.2, 4.2, 5.5, 3.1, 1.8],
  };

  it('renders the Futures Curves panel title', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText('Futures Curves')).toBeInTheDocument();
  });

  it('renders WTI Spot price in KPI strip', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText('WTI Spot')).toBeInTheDocument();
  });

  it('renders Gold Spot price in KPI strip', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText('Gold Spot')).toBeInTheDocument();
  });

  it('displays WTI contract count', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText('WTI Contracts')).toBeInTheDocument();
  });

  it('displays Gold contract count', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText('Gold Contracts')).toBeInTheDocument();
  });

  it('renders WTI crude oil chart title', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText(/WTI Crude Oil/)).toBeInTheDocument();
  });

  it('renders Gold chart title', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText(/Gold —/)).toBeInTheDocument();
  });

  it('renders Dollar Index vs WTI overlay when fredCommodities provided', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} fredCommodities={mockFredCommodities} lastUpdated="2026-04-22" />);
    expect(screen.getByText(/Dollar Index vs WTI/)).toBeInTheDocument();
  });

  it('renders seasonal patterns chart when provided', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} seasonalPatterns={mockSeasonalPatterns} lastUpdated="2026-04-22" />);
    expect(screen.getByText(/Seasonal Patterns/)).toBeInTheDocument();
  });

  it('renders footer with source attribution', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getByText(/CME futures/)).toBeInTheDocument();
  });

  it('shows contango/backwardation indicator when spread > 0', () => {
    render(<FuturesCurve futuresCurveData={mockFuturesCurveData} goldFuturesCurve={mockGoldFuturesCurve} lastUpdated="2026-04-22" />);
    expect(screen.getAllByText(/Contango/).length).toBeGreaterThan(0);
  });
});