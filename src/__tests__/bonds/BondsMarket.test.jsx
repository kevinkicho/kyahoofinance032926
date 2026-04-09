import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('BondsMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows yield curve section (may appear in multiple places)
    const yieldCurveElements = screen.getAllByText(/Yield Curve/i);
    expect(yieldCurveElements.length).toBeGreaterThan(0);
  });

  it('shows KPI strip with key metrics', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // KPI strip shows key indicators
    expect(screen.getByText(/10Y-2Y Spread|Fed Funds|10Y Treasury/i)).toBeInTheDocument();
  });

  it('shows Credit Spreads section', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows credit spreads
    expect(screen.getByText('Credit Spreads')).toBeInTheDocument();
  });

  it('shows Duration Ladder section', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows duration ladder
    expect(screen.getByText('Duration Ladder')).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});