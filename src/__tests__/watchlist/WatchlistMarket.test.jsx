import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WatchlistMarket from '../../markets/watchlist/WatchlistMarket';

vi.mock('../../utils/fetchWithRetry', () => ({
  fetchWithRetry: vi.fn(),
}));

const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: () => { store = {}; },
    _getStore: () => store,
    _setStore: (s) => { store = s; },
  };
};

let mockLocalStorage;

vi.stubGlobal('localStorage', () => {
  if (!mockLocalStorage) mockLocalStorage = createLocalStorageMock();
  return mockLocalStorage;
});

import { fetchWithRetry } from '../../utils/fetchWithRetry';

describe('WatchlistMarket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = createLocalStorageMock();
    vi.stubGlobal('localStorage', mockLocalStorage);
    fetchWithRetry.mockResolvedValue({ json: () => Promise.resolve({}) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty state when no tickers', () => {
    render(<WatchlistMarket />);
    expect(screen.getByText(/No tickers added yet/i)).toBeInTheDocument();
  });

  it('adds ticker when form is submitted', async () => {
    const user = userEvent.setup();

    render(<WatchlistMarket />);

    const input = screen.getByPlaceholderText(/Add ticker/i);
    await user.type(input, 'AAPL');
    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });

  it('renders tickers from localStorage', () => {
    mockLocalStorage._setStore({
      'hub-watchlist-tickers': JSON.stringify(['AAPL', 'MSFT']),
      'hub-watchlist-metrics': null,
    });

    render(<WatchlistMarket />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
  });

  it('displays ticker data from API response', async () => {
    const mockQuote = {
      price: {
        regularMarketPrice: { raw: 150.25, fmt: '150.25' },
        regularMarketChange: { raw: 2.5, fmt: '+2.50' },
        regularMarketChangePercent: { raw: 0.017, fmt: '+1.70%' },
        shortName: 'Apple Inc.',
      },
    };

    fetchWithRetry.mockResolvedValueOnce({
      json: () => Promise.resolve(mockQuote),
    });

    render(<WatchlistMarket />);

    const input = screen.getByPlaceholderText(/Add ticker/i);
    const user = userEvent.setup();
    await user.type(input, 'AAPL');
    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });
  });

  it('shows price for tickers', async () => {
    const mockQuote = {
      price: {
        regularMarketPrice: { raw: 150.25, fmt: '150.25' },
        regularMarketChange: { raw: 2.5, fmt: '+2.50' },
        regularMarketChangePercent: { raw: 0.017, fmt: '+1.70%' },
        shortName: 'Apple Inc.',
      },
    };

    fetchWithRetry.mockResolvedValueOnce({
      json: () => Promise.resolve(mockQuote),
    });

    render(<WatchlistMarket />);

    const input = screen.getByPlaceholderText(/Add ticker/i);
    const user = userEvent.setup();
    await user.type(input, 'AAPL');
    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('150.25')).toBeInTheDocument();
    });
  });

  it('switches between tickers and metrics tabs', async () => {
    const user = userEvent.setup();
    render(<WatchlistMarket />);

    const metricsTab = screen.getByText('My Metrics');
    await user.click(metricsTab);

    expect(screen.getByText('Quick shortcuts')).toBeInTheDocument();

    const tickersTab = screen.getAllByText('My Tickers')[0];
    await user.click(tickersTab);

    expect(screen.getByText(/^No tickers added yet/)).toBeInTheDocument();
  });

  it('limits ticker count to MAX_TICKERS (20)', async () => {
    const manyTickers = Array.from({ length: 20 }, (_, i) => `TICKER${i}`);
    mockLocalStorage._setStore({
      'hub-watchlist-tickers': JSON.stringify(manyTickers),
      'hub-watchlist-metrics': null,
    });

    render(<WatchlistMarket />);

    const input = screen.getByPlaceholderText(/Add ticker/i);
    const user = userEvent.setup();
    await user.type(input, 'NEW');

    const addButton = screen.getByText('Add');
    expect(addButton).toBeDisabled();
  });
});