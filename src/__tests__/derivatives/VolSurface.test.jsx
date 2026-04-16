import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VolSurface from '../../markets/derivatives/components/VolSurface';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const MOCK_VOL_DATA = {
  strikes:  [80, 85, 90, 95, 100, 105, 110, 115, 120],
  expiries: ['1W', '1M', '3M', '6M', '9M', '1Y', '18M', '2Y'],
  grid: Array.from({ length: 8 }, () => Array(9).fill(20)),
};
MOCK_VOL_DATA.grid[2][4] = 22.5; // ATM 1M

describe('VolSurface', () => {
  it('renders panel title and chart without volPremium', () => {
    render(<VolSurface volSurfaceData={MOCK_VOL_DATA} />);
    expect(screen.getByText('Vol Surface')).toBeInTheDocument();
    expect(screen.getAllByTestId('echarts-mock').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show 30d realized or premium stats when volPremium is null', () => {
    render(<VolSurface volSurfaceData={MOCK_VOL_DATA} />);
    // KPI strip always shows ATM 1M IV label; but 30d Realized only shows when volPremium provided
    expect(screen.queryByText('30d Realized')).not.toBeInTheDocument();
  });

  describe('with volPremium', () => {
    it('shows ATM 1M IV label and value', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 }} />);
      expect(screen.getByText('ATM 1M IV')).toBeInTheDocument();
      expect(screen.getByText('22.5%')).toBeInTheDocument();
    });

    it('shows 30d realized vol label and value', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 }} />);
      expect(screen.getByText('30d Realized')).toBeInTheDocument();
      expect(screen.getByText('18.3%')).toBeInTheDocument();
    });

    it('shows positive premium with + prefix', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 }} />);
      expect(screen.getByText('+4.2%')).toBeInTheDocument();
    });

    it('shows negative premium with - prefix', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 15.0, realizedVol30d: 18.0, premium: -3.0 }} />);
      expect(screen.getByText('-3.0%')).toBeInTheDocument();
    });
  });
});
