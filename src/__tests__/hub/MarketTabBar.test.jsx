import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MarketTabBar from '../../hub/MarketTabBar';
import CurrencyContext from '../../hub/CurrencyContext';

// Mock firebase helper
let authStateCallback = null;
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../lib/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(cb => {
      authStateCallback = cb;
      cb(null); // default to logged out
      return () => {};
    }),
    currentUser: null,
  },
  googleProvider: {},
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
  signOut: (...args) => mockSignOut(...args),
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
    if (authStateCallback) {
      act(() => {
        authStateCallback(null);
      });
    }
  });

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

  it('renders user profile avatar placeholder when logged out', () => {
    render(<MarketTabBar {...defaultProps} />);
    const profileBtn = screen.getByLabelText('User profile menu');
    expect(profileBtn).toBeInTheDocument();
    expect(profileBtn).toHaveAttribute('title', 'Not signed in');
  });

  it('opens login dropdown when clicking profile button in logged-out state', () => {
    render(<MarketTabBar {...defaultProps} />);
    const profileBtn = screen.getByLabelText('User profile menu');
    
    // Dropdown should not be visible initially
    expect(screen.queryByText('Sign In with Google')).not.toBeInTheDocument();
    
    // Click to open dropdown
    fireEvent.click(profileBtn);
    expect(screen.getByText('Guest User')).toBeInTheDocument();
    expect(screen.getByText('Not signed in')).toBeInTheDocument();
    
    const signInBtn = screen.getByText('Sign In with Google');
    expect(signInBtn).toBeInTheDocument();
    
    // Click sign in button
    fireEvent.click(signInBtn);
    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it('renders logged-in user profile details and supports logoff', () => {
    render(<MarketTabBar {...defaultProps} />);
    
    // Simulate logging in
    act(() => {
      authStateCallback({
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.png',
      });
    });

    const profileBtn = screen.getByLabelText('User profile menu');
    expect(profileBtn).toHaveAttribute('title', 'Logged in as test@example.com');
    
    // Verify profile image is rendered
    const img = screen.getByAltText('Test User');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.png');

    // Open dropdown
    fireEvent.click(profileBtn);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    const logoutBtn = screen.getByText('Log Off');
    expect(logoutBtn).toBeInTheDocument();
    
    // Click logoff
    fireEvent.click(logoutBtn);
    expect(mockSignOut).toHaveBeenCalled();
  });
});
