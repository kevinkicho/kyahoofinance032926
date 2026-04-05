// src/__tests__/commodities/FuturesCurve.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FuturesCurve from '../../markets/commodities/components/FuturesCurve';
import { futuresCurveData } from '../../markets/commodities/data/mockCommoditiesData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

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
    expect(screen.getByText(/backwardation/i)).toBeInTheDocument();
  });

  it('shows Contango pill when last price > first price', () => {
    const contangoData = {
      ...futuresCurveData,
      prices: [80.0, 80.5, 81.0, 81.5, 82.0, 82.5, 83.0, 83.5],
    };
    render(<FuturesCurve futuresCurveData={contangoData} />);
    expect(screen.getByText(/contango/i)).toBeInTheDocument();
  });

  it('renders subtitle with contract month count', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    // labels has 8 entries → "8 contract months"
    expect(screen.getByText(/8 contract months/i)).toBeInTheDocument();
  });
});
