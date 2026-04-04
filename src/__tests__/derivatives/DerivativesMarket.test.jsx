import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('DerivativesMarket', () => {
  it('renders Vol Surface tab by default', () => {
    render(<DerivativesMarket />);
    expect(screen.getAllByText('Vol Surface').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', () => {
    render(<DerivativesMarket />);
    expect(screen.getByRole('button', { name: 'Vol Surface'        })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VIX Term Structure' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options Flow'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fear & Greed'       })).toBeInTheDocument();
  });

  it('switches to VIX Term Structure on click', () => {
    render(<DerivativesMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'VIX Term Structure' }));
    expect(screen.getAllByText(/contango|backwardation/i).length).toBeGreaterThan(0);
  });

  it('switches to Options Flow on click', () => {
    render(<DerivativesMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Options Flow' }));
    expect(screen.getByText(/unusual options activity/i)).toBeInTheDocument();
  });

  it('switches to Fear & Greed on click', () => {
    render(<DerivativesMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Fear & Greed' }));
    expect(screen.getByText(/composite sentiment/i)).toBeInTheDocument();
  });

  it('shows mock data status', () => {
    render(<DerivativesMarket />);
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
