import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalMacroMarket from '../../markets/globalMacro/GlobalMacroMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('GlobalMacroMarket', () => {
  it('renders all 4 sub-tabs after loading', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Scorecard'       })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Growth & Inflation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Central Bank Rates' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Debt Monitor'    })).toBeInTheDocument();
  });

  it('shows Scorecard tab by default', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/macro scorecard/i)).toBeInTheDocument();
  });

  it('switches to Growth & Inflation tab on click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Growth & Inflation' }));
    expect(screen.getByText(/gdp growth/i)).toBeInTheDocument();
  });

  it('switches to Central Bank Rates tab on click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Central Bank Rates' }));
    expect(screen.getByText(/policy rates/i)).toBeInTheDocument();
  });

  it('switches to Debt Monitor tab on click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Debt Monitor' }));
    expect(screen.getByText(/government debt \(% of gdp\)/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
