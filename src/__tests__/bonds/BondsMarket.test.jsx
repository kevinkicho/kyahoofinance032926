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

  it('shows sidebar with key metrics', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Sidebar shows key indicators in metric cards
    // Check for sidebar sections
    const yieldsSection = screen.getByText('Yields');
    expect(yieldsSection).toBeInTheDocument();
  });

  it('shows all charts visible at once (no tabs)', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // All charts should be visible at once - check for key panel titles
    const yieldCurveElements = screen.getAllByText('Yield Curve');
    expect(yieldCurveElements.length).toBeGreaterThan(0);
    // Check that there are no tab buttons
    const tabButtons = screen.queryAllByRole('button');
    // Should have no tab buttons for navigation (may have other buttons)
    const tabNavButtons = tabButtons.filter(btn =>
      btn.className && btn.className.includes('tab') && btn.className.includes('bonds')
    );
    expect(tabNavButtons.length).toBe(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});