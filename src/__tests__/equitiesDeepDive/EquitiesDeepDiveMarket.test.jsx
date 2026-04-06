import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EquitiesDeepDiveMarket from '../../markets/equitiesDeepDive/EquitiesDeepDiveMarket';

vi.mock('../../markets/equitiesDeepDive/data/useEquityDeepDiveData', () => ({
  useEquityDeepDiveData: () => ({
    sectorData:   { sectors: [] },
    factorData:   { inFavor: {}, stocks: [] },
    earningsData: { upcoming: [], beatRates: [] },
    shortData:    { mostShorted: [] },
    isLive:       false,
    lastUpdated:  null,
    isLoading:    false,
  }),
}));

describe('EquitiesDeepDiveMarket', () => {
  it('renders 4 sub-tab buttons', () => {
    render(<EquitiesDeepDiveMarket />);
    expect(screen.getByRole('tab', { name: 'Sector Rotation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Factor Rankings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Earnings Watch'  })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Short Interest'  })).toBeInTheDocument();
  });

  it('shows Sector Rotation view by default', () => {
    render(<EquitiesDeepDiveMarket />);
    expect(screen.getByText(/etf performance/i)).toBeInTheDocument();
  });

  it('switches to Factor Rankings tab on click', () => {
    render(<EquitiesDeepDiveMarket />);
    fireEvent.click(screen.getByRole('tab', { name: 'Factor Rankings' }));
    expect(screen.getByText(/factor in favor/i)).toBeInTheDocument();
  });

  it('switches to Earnings Watch tab on click', () => {
    render(<EquitiesDeepDiveMarket />);
    fireEvent.click(screen.getByRole('tab', { name: 'Earnings Watch' }));
    expect(screen.getByText(/upcoming earnings/i)).toBeInTheDocument();
  });

  it('switches to Short Interest tab on click', () => {
    render(<EquitiesDeepDiveMarket />);
    fireEvent.click(screen.getByRole('tab', { name: 'Short Interest' }));
    expect(screen.getByText(/most shorted/i)).toBeInTheDocument();
  });

  it('shows mock status bar when not live', () => {
    render(<EquitiesDeepDiveMarket />);
    expect(screen.getByText(/mock data/i)).toBeInTheDocument();
  });
});
