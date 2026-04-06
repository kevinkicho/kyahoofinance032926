// src/__tests__/commodities/CommoditiesMarket.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommoditiesMarket from '../../markets/commodities/CommoditiesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('CommoditiesMarket', () => {
  it('renders all 4 sub-tabs after loading', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Price Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Futures Curve'   })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sector Heatmap'  })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Supply & Demand' })).toBeInTheDocument();
  });

  it('shows Price Dashboard tab by default', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/price dashboard/i).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Futures Curve tab on click', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Futures Curve' }));
    expect(screen.getByText(/WTI Crude Oil/i)).toBeInTheDocument();
  });

  it('switches to Sector Heatmap tab on click', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Sector Heatmap' }));
    expect(screen.getByText(/sector performance/i)).toBeInTheDocument();
  });

  it('switches to Supply & Demand tab on click', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Supply & Demand' }));
    expect(screen.getByText(/crude oil/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
