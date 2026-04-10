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
    // Dashboard shows sidebar with key prices section
    const keyPricesSection = screen.getByText('Key Prices');
    expect(keyPricesSection).toBeInTheDocument();
  });

  it('shows sidebar with key metrics', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Sidebar shows key indicators in metric cards
    // Gold, Oil, Nat Gas should appear in sidebar
    const goldElements = screen.getAllByText(/Gold/i);
    expect(goldElements.length).toBeGreaterThan(0);
  });

  it('shows all content visible at once (no tabs)', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // All content should be visible - check for key panel titles
    const energyPanel = screen.getByText('Energy');
    expect(energyPanel).toBeInTheDocument();
    // Check that there are no tab buttons for navigation
    const tabButtons = screen.queryAllByRole('button');
    const tabNavButtons = tabButtons.filter(btn =>
      btn.className && btn.className.includes('tab') && btn.className.includes('com')
    );
    expect(tabNavButtons.length).toBe(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});