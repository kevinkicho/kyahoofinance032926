import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReerChart from '../../markets/fx/components/ReerChart';

vi.mock('../../components/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const reer = {
  dates: ['2026-01', '2026-02', '2026-03'],
  US: [110, 112, 115],
  EU: [98, 97, 96],
  JP: [90],
};

describe('ReerChart KPI pills', () => {
  it('shows +Δ sublabel for rising REER', () => {
    render(<ReerChart reer={reer} />);
    // US: 115 - 112 = +3.0
    expect(screen.getByText('+3.0 chg')).toBeInTheDocument();
  });

  it('shows -Δ sublabel for falling REER', () => {
    render(<ReerChart reer={reer} />);
    // EU: 96 - 97 = -1.0
    expect(screen.getByText('-1.0 chg')).toBeInTheDocument();
  });

  it('omits Δ sublabel for countries with fewer than 2 points', () => {
    render(<ReerChart reer={reer} />);
    // US and EU have chg sublabels; JP has a single value → no chg for JP.
    expect(screen.getAllByText(/chg$/i).length).toBe(2);
  });
});
