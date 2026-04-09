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

  it('shows tabs for navigation', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard has tab navigation - check for Yield Curves tab button
    const yieldsTab = screen.getByRole('button', { name: 'Yield Curves' });
    expect(yieldsTab).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});