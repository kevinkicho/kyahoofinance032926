import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('BondsMarket', () => {
  it('renders Yield Curve tab by default after loading', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Yield Curve').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Yield Curve'     })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Credit Matrix'   })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Spread Monitor'  })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Duration Ladder' })).toBeInTheDocument();
  });

  it('switches to Credit Matrix on click', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Credit Matrix' }));
    expect(screen.getAllByText(/S&P|AAA|rating/i).length).toBeGreaterThan(0);
  });

  it('switches to Spread Monitor on click', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Spread Monitor' }));
    expect(screen.getAllByText(/spread|OAS|IG|HY/i).length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
