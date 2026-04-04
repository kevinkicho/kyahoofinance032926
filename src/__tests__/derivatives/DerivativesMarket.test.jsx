import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('DerivativesMarket', () => {
  it('renders Vol Surface tab by default after loading', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Vol Surface').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Vol Surface'        })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VIX Term Structure' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options Flow'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fear & Greed'       })).toBeInTheDocument();
  });

  it('switches to Options Flow on click', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Options Flow' }));
    expect(screen.getByText(/unusual options activity/i)).toBeInTheDocument();
  });

  it('switches to Fear & Greed on click', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Fear & Greed' }));
    expect(screen.getByText(/composite sentiment/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
