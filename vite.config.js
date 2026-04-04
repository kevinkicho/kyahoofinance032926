import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

// Lightweight in-memory cache — no npm package needed
function makeCache(ttlSeconds) {
  const store = new Map();
  return {
    get: (k) => {
      const entry = store.get(k);
      if (!entry) return null;
      if (Date.now() > entry.expires) { store.delete(k); return null; }
      return entry.value;
    },
    set: (k, v, ttl = ttlSeconds) => store.set(k, { value: v, expires: Date.now() + ttl * 1000 })
  };
}

const cache = makeCache(900); // 15-minute default TTL

const FRED_SERIES = {
  M1: 'M1SL', M2: 'M2SL', CPI: 'CPIAUCSL',
  FFR: 'FEDFUNDS', UNEMP: 'UNRATE', GDP: 'GDP'
};

const SEC_USER_AGENT = 'kyahoofinance-researcher@example.com (Educational Sandbox)';

function fetchJSON(url, customAgent = 'Mozilla/5.0') {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': customAgent } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function fetchText(url, customAgent = 'Mozilla/5.0') {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': customAgent } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function macroApiPlugin() {
  return {
    name: 'macro-api',
    configureServer(server) {

      // Health
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', source: 'vite-plugin', timestamp: new Date() }));
      });

      // FRED macro data
      server.middlewares.use('/api/macro', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const hit = cache.get('fred_macro');
        if (hit) return res.end(JSON.stringify(hit));
        try {
          const results = {};
          await Promise.allSettled(
            Object.entries(FRED_SERIES).map(async ([key, id]) => {
              try {
                const data = await fetchJSON(`https://fred.stlouisfed.org/graph/fredgraph.json?id=${id}`);
                if (Array.isArray(data)) {
                  const recent = data.filter(d => d.value !== '.').slice(-2);
                  results[key] = {
                    seriesId: id,
                    latest: parseFloat(recent.at(-1)?.value),
                    prev:   parseFloat(recent.at(-2)?.value),
                    date:   recent.at(-1)?.date
                  };
                }
              } catch { /* skip */ }
            })
          );
          cache.set('fred_macro', results, 3600);
          res.end(JSON.stringify(results));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // /api/stocks, /api/summary, /api/history are proxied to Express (see server.proxy below)

      // Local 🦙 Ollama AI Extraction Engine (Zero Cost, 100% Offline)
      server.middlewares.use('/api/ollama-extraction', async (req, res) => {
        if (req.method !== 'POST') { res.end('{}'); return; }
        res.setHeader('Content-Type', 'application/json');
        
        // Accumulate request body for potentially massive text pastes
        let body = '';
        for await (const chunk of req) body += chunk;
        
        try {
          const { ticker, text, ollamaModel = 'llama3' } = JSON.parse(body);
          if (!text || text.trim() === '') throw new Error('No SEC text provided.');

          // Aggressively strip excess whitespace to save context window tokens
          const condensedText = text.replace(/<[^>]*>?/igm, " ").replace(/\s+/g, " ").substring(0, 300000);

          const prompt = `
            You are a forensic algorithmic analyst parsing a raw SEC accounting document.
            Extract exactly three things from this raw text string dump of a 10-K/10-Q report:
            1. Total Assets (as an exact readable dollar string, e.g. "$120 Billion")
            2. Total Liabilities (as an exact readable dollar string)
            3. A short, highly precise, 3-bullet-point summary of the core risks to the business stated by the CEO or Management in the Risk Factors section.

            You must return exactly a strictly formatted JSON object with NO markdown wrappers, NO backticks, and NO explaining text. Here is the strict JSON format required:
            { "assets": "$XXX", "liabilities": "$XXX", "risks": ["point1", "point2", "point3"] }
            
            SEC Text Dump follows:
            ${condensedText}
          `;

          // Post directly to the local Ollama daemon (Default port 11434)
          // Using native Node 18+ fetch for HTTP
          const response = await globalThis.fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              prompt: prompt,
              stream: false,
              format: "json" // Force structural compliance
            })
          });

          if (!response.ok) {
            throw new Error(`Ollama daemon returning status: ${response.status}. Is it running locally?`);
          }

          const responseData = await response.json();
          let cleanJsonStr = responseData.response.trim();
          
          // Fallback cleanup if Ollama ignored strict JSON rules
          cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          const fundamentals = JSON.parse(cleanJsonStr);

          res.end(JSON.stringify({
            ...fundamentals,
            ticker: ticker.toUpperCase()
          }));

        } catch (e) {
          console.error('Ollama Pipeline Error:', e);
          res.statusCode = 500;
          let errMsg = e.message;
          if (e.cause?.code === 'ECONNREFUSED') {
            errMsg = 'Connection refused. Please ensure Ollama is installed and running in your background (http://localhost:11434).';
          }
          res.end(JSON.stringify({ error: errMsg }));
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), macroApiPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api/stocks':      { target: 'http://localhost:3001', changeOrigin: true },
      '/api/summary':     { target: 'http://localhost:3001', changeOrigin: true },
      '/api/history':     { target: 'http://localhost:3001', changeOrigin: true },
      '/api/snapshot':    { target: 'http://localhost:3001', changeOrigin: true },
      '/api/bonds':       { target: 'http://localhost:3001', changeOrigin: true },
      '/api/derivatives': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/realEstate':  { target: 'http://localhost:3001', changeOrigin: true },
      '/api/insurance':   { target: 'http://localhost:3001', changeOrigin: true },
    }
  }
})
