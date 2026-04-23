import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BreakevenMonitor from '../../markets/bonds/components/BreakevenMonitor';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));
vi.mock('../../components/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockBreakevensData = {
  current: {
    be5y: 2.45,
    be10y: 2.38,
    forward5y5y: 2.52,
    real5y: 1.85,
    real10y: 1.95,
  },
  history: {
    dates: ['2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18', '2026-04-19', '2026-04-20'],
    be5y: [2.40, 2.41, 2.42, 2.43, 2.44, 2.45, 2.45],
    be10y: [2.33, 2.34, 2.35, 2.36, 2.37, 2.38, 2.38],
    forward5y5y: [2.47, 2.48, 2.49, 2.50, 2.51, 2.52, 2.52],
  },
};

describe('BreakevenMonitor', () => {
  it('renders when data is provided', () => {
    render(<BreakevenMonitor breakevensData={mockBreakevensData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders empty when no data provided', () => {
    const { container } = render(<BreakevenMonitor breakevensData={null} />);
    expect(container.firstChild).toBeNull();
  });
});
