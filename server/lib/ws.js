import { WebSocketServer } from 'ws';
import yahooFinance from 'yahoo-finance2';
import { trackApiCall } from './rateLimits.js';

const FX_TICKERS = ['EURUSD=X', 'GBPUSD=X', 'JPYUSD=X', 'CNYUSD=X', 'CHFUSD=X', 'AUDUSD=X', 'CADUSD=X', 'SEKUSD=X', 'NOKUSD=X', 'NZDUSD=X', 'HKDUSD=X', 'SGDUSD=X', 'INRUSD=X', 'KRWUSD=X', 'MXNUSD=X', 'BRLUSD=X', 'ZARUSD=X'];
const INTERVAL_MS = 30000;

let wss = null;
let intervalId = null;

export function startFxWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws/fx' });

  wss.on('connection', (ws) => {
    console.log('[WS/FX] Client connected');

    ws.on('close', () => {
      console.log('[WS/FX] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS/FX] Client error:', err.message);
    });
  });

  const broadcast = async () => {
    if (!wss || wss.clients.size === 0) return;

    try {
      trackApiCall('Yahoo Finance', FX_TICKERS.length);
      const results = await yahooFinance.quotes(FX_TICKERS);

      const rates = {};
      for (const q of results) {
        if (q.regularMarketPrice != null) {
          const symbol = q.symbol.replace('=X', '');
          rates[symbol] = q.regularMarketPrice;
        }
      }

      const msg = JSON.stringify({ type: 'fx-rates', rates, timestamp: new Date().toISOString() });

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(msg);
        }
      });
    } catch (err) {
      console.warn('[WS/FX] Fetch error:', err.message);
    }
  };

  intervalId = setInterval(broadcast, INTERVAL_MS);

  console.log('[WS/FX] WebSocket server started at /ws/fx');
}

export function stopFxWebSocket() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (wss) {
    wss.close();
    wss = null;
  }
}
