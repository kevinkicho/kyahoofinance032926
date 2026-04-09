import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('DerivativesMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows VIX Term Structure section (may appear multiple times)
    const vixElements = screen.getAllByText(/VIX Term Structure/i);
    expect(vixElements.length).toBeGreaterThan(0);
  });

  it('shows KPI strip with key metrics', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // KPI strip shows VIX (may appear multiple times)
    const vixElements = screen.getAllByText(/VIX Spot|VIX/i);
    expect(vixElements.length).toBeGreaterThan(0);
  });

  it('shows Vol Surface section', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows vol surface (may appear multiple times)
    const volElements = screen.getAllByText(/Vol Surface/i);
    expect(volElements.length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});