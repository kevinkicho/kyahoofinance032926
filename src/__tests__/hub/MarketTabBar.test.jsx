import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketTabBar from '../../hub/MarketTabBar';
import CurrencyContext from '../../hub/CurrencyContext';

// MarketTabBar reads { currency, setCurrency } from CurrencyContext, not props.
// Tests that need to assert on setCurrency must wrap in a provider with a stub.
function renderWithCurrency(ui, { currency = 'USD', setCurrency = vi.fn() } = {}) {
  const ctxValue = {
    currency,
    setCurrency,
    rates: { USD: 1, EUR: 0.92 },
    symbols: { USD: '$', EUR: '€' },
    currentRate: 1,
    currentSymbol: '$',
    convert: v => v,
    convertAndFormat: v => String(v),
    ratesLive: false,
  };
  return {
    setCurrency,
    ...render(
      <CurrencyContext.Provider value={ctxValue}>{ui}</CurrencyContext.Provider>
    ),
  };
}

describe('MarketTabBar', () => {
  const defaultProps = {
    activeMarket: 'equities',
    setActiveMarket: vi.fn(),
  };

  it('renders all 6 market tabs', () => {
    render(<MarketTabBar {...defaultProps} />);
    expect(screen.getByText('Equities')).toBeInTheDocument();
    expect(screen.getByText('Bonds')).toBeInTheDocument();
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('Derivatives')).toBeInTheDocument();
    expect(screen.getByText('Real Estate')).toBeInTheDocument();
    expect(screen.getByText('Insurance')).toBeInTheDocument();
  });

  it('marks the active market tab with the active class', () => {
    render(<MarketTabBar {...defaultProps} activeMarket="bonds" />);
    const bondsBtn = screen.getByText('Bonds').closest('button');
    expect(bondsBtn).toHaveClass('active');
    const equitiesBtn = screen.getByText('Equities').closest('button');
    expect(equitiesBtn).not.toHaveClass('active');
  });

  it('calls setActiveMarket with the correct id when a tab is clicked', () => {
    const setActiveMarket = vi.fn();
    render(<MarketTabBar {...defaultProps} setActiveMarket={setActiveMarket} />);
    fireEvent.click(screen.getByText('Bonds'));
    expect(setActiveMarket).toHaveBeenCalledWith('bonds');
  });

  it('calls setCurrency when the currency select changes', () => {
    const { setCurrency } = renderWithCurrency(<MarketTabBar {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox', { name: /currency/i }), { target: { value: 'EUR' } });
    expect(setCurrency).toHaveBeenCalledWith('EUR');
  });
});
