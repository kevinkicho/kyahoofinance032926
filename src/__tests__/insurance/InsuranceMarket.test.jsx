import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InsuranceMarket from '../../markets/insurance/InsuranceMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

// Make fetch fail fast so hook falls back to mock data
beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('InsuranceMarket', () => {
  it('renders Cat Bond Spreads tab by default after loading', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Cat Bond Spreads').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Cat Bond Spreads'    })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Combined Ratio'      })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Reserve Adequacy'    })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Reinsurance Pricing' })).toBeInTheDocument();
  });

  it('switches to Combined Ratio on click', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Combined Ratio' }));
    expect(screen.getByText(/combined ratio monitor/i)).toBeInTheDocument();
  });

  it('switches to Reserve Adequacy on click', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Reserve Adequacy' }));
    expect(screen.getByText(/reserve adequacy/i)).toBeInTheDocument();
  });

  it('switches to Reinsurance Pricing on click', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Reinsurance Pricing' }));
    expect(screen.getByText(/treaty reinsurance market/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
