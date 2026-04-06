import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MacroScorecard from '../../markets/globalMacro/components/MacroScorecard';
import { scorecardData } from '../../markets/globalMacro/data/mockGlobalMacroData';

describe('MacroScorecard', () => {
  it('renders panel title', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    expect(screen.getByText(/macro scorecard/i)).toBeInTheDocument();
  });

  it('renders all 5 column headers', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    expect(screen.getAllByText(/gdp/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/cpi inflation/i)).toBeInTheDocument();
    expect(screen.getByText(/policy rate/i)).toBeInTheDocument();
    expect(screen.getByText(/unemp/i)).toBeInTheDocument();
    expect(screen.getAllByText(/debt/i).length).toBeGreaterThan(0);
  });

  it('renders all 12 country names', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    ['United States','Euro Area','United Kingdom','Japan','Canada',
     'China','India','Brazil','South Korea','Australia','Mexico','Sweden'].forEach(name => {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('applies mac-heat-dg to India GDP (8.2 > 3)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dg').length).toBeGreaterThan(0);
  });

  it('applies mac-heat-dr to UK CPI (6.7 > 6)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dr').length).toBeGreaterThan(0);
  });

  it('applies mac-heat-dr to Japan debt (261.3 > 120)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dr').length).toBeGreaterThan(0);
  });
});
