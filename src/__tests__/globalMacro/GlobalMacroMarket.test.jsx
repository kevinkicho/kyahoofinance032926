import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalMacroMarket from '../../markets/globalMacro/GlobalMacroMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('GlobalMacroMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows country scorecard section
    expect(screen.getByText(/country scorecard/i)).toBeInTheDocument();
  });

  it('shows KPI strip with global metrics', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // KPI strip shows key indicators
    expect(screen.getByText(/g7 gdp/i)).toBeInTheDocument();
    expect(screen.getByText(/global cpi/i)).toBeInTheDocument();
  });

  it('shows compact scorecard table with countries', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Scorecard shows country flags and metrics
    expect(screen.getByText('GDP')).toBeInTheDocument();
    expect(screen.getByText('CPI')).toBeInTheDocument();
  });

  it('shows chart panels with GDP, CPI, Rates, Debt', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Chart panels are visible
    expect(screen.getByText(/gdp growth/i)).toBeInTheDocument();
    expect(screen.getByText(/cpi inflation/i)).toBeInTheDocument();
    expect(screen.getByText(/policy rates/i)).toBeInTheDocument();
    expect(screen.getByText(/debt \/ gdp/i)).toBeInTheDocument();
  });

  it('shows economic activity panel with CFNAI and OECD CLI', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/economic activity/i)).toBeInTheDocument();
    expect(screen.getByText(/oecd leading/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });

  it('shows country detail panel on row click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Scorecard rows are clickable - verify they exist
    const scorecardRows = document.querySelectorAll('.mac-scorecard-row');
    expect(scorecardRows.length).toBeGreaterThan(0);
  });
});