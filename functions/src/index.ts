import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import NodeCache from "node-cache";
import crypto from "crypto";
import fs from "fs";
import path from "path";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

const app = express();

const localCache = new NodeCache({ stdTTL: 900 });
app.locals.cache = {
  get: (key: string) => localCache.get(key),
  set: (key: string, val: any, ttl: number = 900) => localCache.set(key, val, ttl),
  del: (key: string) => localCache.del(key),
  flushAll: () => localCache.flushAll(),
};

app.use(cors({ origin: true }));
app.use(express.json({ limit: "256kb" }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  next();
});

const endpointTracker: Record<string, any> = {};

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    let ep = req.path.replace(/\/[A-Z]{1,5}$/, "/:ticker").replace(/\/\d+$/, "/:id");
    if (!endpointTracker[ep]) {
      endpointTracker[ep] = {
        calls: 0,
        totalMs: 0,
        maxMs: 0,
        minMs: Infinity,
        errors: 0,
        lastCalled: null,
        recentMs: [],
        recentErrors: [],
      };
    }
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

function loadRoutes(app: express.Express) {
  const routesDir = path.join(__dirname, "routes");
  if (!fs.existsSync(routesDir)) return;

  const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".js") || f.endsWith(".ts"));

  for (const file of routeFiles) {
    try {
      const router = require(path.join(routesDir, file));
      const routeName = file.replace(/\.(js|ts)$/, "");

      if (routeName === "ticker") {
        app.use("/api", router);
      } else {
        app.use(`/api/${routeName}`, router);
      }
    } catch (e: any) {
      logger.error(`Failed to load route ${file}:`, e.message);
    }
  }
}

loadRoutes(app);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.get("/api/cache/status", (_req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  res.json({ today, status: {} });
});

app.get("/api/rate-limits", (_req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  res.json({ date: today, sources: [] });
});

export const api = onRequest(
  {
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
  },
  app
);