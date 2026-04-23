import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketTabBar from '../../hub/MarketTabBar';

const defaultProps = {
  activeMarket: 'bonds',
  setActiveMarket: vi.fn(),
  currency: 'USD',
  setCurrency: vi.fn(),
};

describe('MarketTabBar navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches to derivatives tab when clicking Derivatives tab', () => {
    render(<MarketTabBar {...defaultProps} />);
    const derivTab = screen.getByText('Derivatives');
    fireEvent.click(derivTab);
    expect(defaultProps.setActiveMarket).toHaveBeenCalledWith('derivatives');
  });

  it('switches to equities tab when clicking Equities tab', () => {
    render(<MarketTabBar {...defaultProps} />);
    const equitiesTab = screen.getByText('Equities');
    fireEvent.click(equitiesTab);
    expect(defaultProps.setActiveMarket).toHaveBeenCalledWith('equities');
  });

  it('switches to fx tab when clicking FX tab', () => {
    render(<MarketTabBar {...defaultProps} />);
    const fxTab = screen.getByText('FX');
    fireEvent.click(fxTab);
    expect(defaultProps.setActiveMarket).toHaveBeenCalledWith('fx');
  });

  it('switches to commodities tab when clicking Commodities tab', () => {
    render(<MarketTabBar {...defaultProps} />);
    const commoditiesTab = screen.getByText('Commodities');
    fireEvent.click(commoditiesTab);
    expect(defaultProps.setActiveMarket).toHaveBeenCalledWith('commodities');
  });

  it('switches to credit tab when clicking Credit tab', () => {
    render(<MarketTabBar {...defaultProps} />);
    const creditTab = screen.getByText('Credit');
    fireEvent.click(creditTab);
    expect(defaultProps.setActiveMarket).toHaveBeenCalledWith('credit');
  });
});