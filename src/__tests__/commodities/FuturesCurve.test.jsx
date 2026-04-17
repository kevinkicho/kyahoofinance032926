// src/__tests__/commodities/FuturesCurve.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FuturesCurve from '../../markets/commodities/components/FuturesCurve';
const futuresCurveData = {
  name: 'WTI Crude Oil',
  labels: ['May 24', 'Jun 24', 'Jul 24', 'Aug 24', 'Sep 24', 'Oct 24', 'Nov 24', 'Dec 24'],
  prices: [82.14, 81.82, 81.50, 81.18, 80.86, 80.54, 80.48, 80.48],
  spotPrice: 82.14,
  unit: '$/bbl',
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('FuturesCurve', () => {
  it('renders the chart', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders commodity name in panel title', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    expect(screen.getByText(/WTI Crude Oil/i)).toBeInTheDocument();
  });

  it('shows Backwardation pill for mock data (prices slope downward)', () => {
    // Mock data prices: [82.14, 81.82, ...80.48] → last < first → backwardation
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    expect(screen.getAllByText(/backwardation/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows Contango pill when last price > first price', () => {
    const contangoData = {
      ...futuresCurveData,
      prices: [80.0, 80.5, 81.0, 81.5, 82.0, 82.5, 83.0, 83.5],
    };
    render(<FuturesCurve futuresCurveData={contangoData} />);
    expect(screen.getAllByText(/contango/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders subtitle with contract month count', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    // labels has 8 entries → KPI strip shows "8" contracts + chart title shows "8 Months"
    expect(screen.getAllByText(/8/i).length).toBeGreaterThanOrEqual(1);
  });
});
