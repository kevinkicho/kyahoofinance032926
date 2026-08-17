import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CpiComponents from '../../markets/bonds/components/CpiComponents';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockData = {
  dates: ['2024-01', '2024-02', '2024-03'],
  all: [3.2, 3.1, 3.0],
  core: [3.1, 3.0, 2.9],
  food: [2.4, 2.3, 2.2],
  energy: [-1.2, -0.8, 0.4],
};

describe('CpiComponents', () => {
  it('renders the chart when series paint', () => {
    render(<CpiComponents cpiComponents={mockData} lastUpdated="2026-08-16" />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('does not remount-crash when leftover series bags are isLive-only', () => {
    const leftover = {
      isLive: true,
      dates: ['2024-01', '2024-02'],
      all: { isLive: true },
      core: [3.1, 3.0],
      food: { isLive: true },
      energy: true,
    };
    expect(() => render(<CpiComponents cpiComponents={leftover} lastUpdated="2026-08-16" />)).not.toThrow();
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('shows empty shell when only leftover bags exist', () => {
    render(<CpiComponents cpiComponents={{ dates: { isLive: true }, all: { isLive: true } }} />);
    expect(screen.getByText(/No CPI data available/i)).toBeInTheDocument();
  });
});
