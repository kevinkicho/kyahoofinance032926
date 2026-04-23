import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BreakevenMonitor from '../../markets/bonds/components/BreakevenMonitor';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const mockBreakevenData = {
  breakeven5y: 2.45,
  breakeven10y: 2.38,
  breakeven5y5y: 2.52,
  breakevenHistory: {
    dates: ['2026-04-20', '2026-04-21', '2026-04-22'],
    be5y: [2.42, 2.44, 2.45],
    be10y: [2.35, 2.37, 2.38],
    forward5y5y: [2.48, 2.50, 2.52],
  },
};

describe('BreakevenMonitor', () => {
  it('renders when data is provided', () => {
    render(<BreakevenMonitor breakevenData={mockBreakevenData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders empty when no data provided', () => {
    const { container } = render(<BreakevenMonitor breakevenData={null} />);
    expect(container.firstChild).toBeTruthy();
  });
});