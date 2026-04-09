// src/__tests__/commodities/CommoditiesMarket.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CommoditiesMarket from '../../markets/commodities/CommoditiesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('CommoditiesMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows commodity prices section
    const priceElements = screen.getAllByText(/Commodity Prices/i);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('shows KPI strip with key metrics', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // KPI strip shows key indicators (may appear multiple times)
    const kpiElements = screen.getAllByText(/Gold|Oil|Nat Gas/i);
    expect(kpiElements.length).toBeGreaterThan(0);
  });

  it('shows sector performance section', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows sector performance (may appear multiple times)
    const sectorElements = screen.getAllByText(/Sector Performance/i);
    expect(sectorElements.length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});