const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

const localCache = new NodeCache({ stdTTL: 900 });

app.use(cors({ origin: true }));
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

app.locals.cache = {
  get: (key) => localCache.get(key),
  set: (key, val, ttl) => localCache.set(key, val, ttl),
  del: (key) => localCache.del(key),
  flushAll: () => localCache.flushAll(),
};

const endpointTracker = {};
app.locals.endpointTracker = endpointTracker;

app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    let ep = req.path.replace(/\/[A-Z]{1,5}$/, '/:ticker').replace(/\/\d+$/, '/:id');
    if (!endpointTracker[ep]) endpointTracker[ep] = { calls: 0, totalMs: 0, maxMs: 0, minMs: Infinity, errors: 0, lastCalled: null, recentMs: [], recentErrors: [] };
    const m = endpointTracker[ep];
    m.calls++;
    m.totalMs += ms;
    m.maxMs = Math.max(m.maxMs, ms);
    m.minMs = Math.min(m.minMs, ms);
    if (status >= 400) {
      m.errors++;
      m.recentErrors.unshift({ ts: new Date().toISOString(), status, ms });
      if (m.recentErrors.length > 20) m.recentErrors.length = 20;
    }
    m.recentMs.push(ms);
    if (m.recentMs.length > 100) m.recentMs.shift();
    m.lastCalled = new Date().toISOString();
  });
  next();
});

function loadRoutes(app) {
  const routesDir = path.join(__dirname, '..', 'server', 'routes');
  if (!fs.existsSync(routesDir)) return;
  
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  for (const file of routeFiles) {
    try {
      const router = require(path.join(routesDir, file));
      const routeName = file.replace('.js', '');
      
      if (routeName === 'ticker') {
        app.use('/api', router);
      } else {
        app.use(`/api/${routeName}`, router);
      }
    } catch (e) {
      console.error(`Failed to load route ${file}:`, e.message);
    }
  }
}

loadRoutes(app);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/cache/status', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({ today, status: {} });
});

app.get('/api/rate-limits', (req, res) => {
  res.json({ date: today, sources: [] });
});

exports.api = onRequest({ 
  cors: true,
  memory: '512MiB',
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 10
}, app);