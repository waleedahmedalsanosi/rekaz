/**
 * server/app.ts — Express app factory (no listen() call).
 *
 * Imported by:
 *  - server/index.ts  → local dev + Render (calls initDB then app.listen)
 *  - api/index.ts     → Vercel serverless adapter (exports app as default handler)
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Sentry from '@sentry/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import authRouter from './routes/auth.js';
import providersRouter from './routes/providers.js';
import servicesRouter from './routes/services.js';
import bookingsRouter from './routes/bookings.js';
import messagesRouter from './routes/messages.js';
import walletRouter from './routes/wallet.js';
import reviewsRouter from './routes/reviews.js';
import adminRouter from './routes/admin.js';
import paymentsRouter from './routes/payments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const isProd = process.env.NODE_ENV === 'production';

// ─── Sentry ─────────────────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: isProd ? 0.2 : 1.0,
  });
}

// ─── Rate limiter ────────────────────────────────────────────────────────────
// On Vercel (serverless): use Upstash Redis (state survives across invocations).
// On Render / local (long-lived): fall back to in-memory Map.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Prune stale entries on long-lived servers every 5 min.
// On serverless this interval never fires, which is intentional.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) if (now > v.resetAt) rateLimitMap.delete(k);
}, 5 * 60 * 1000).unref?.();

let upstashRl: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  upstashRl = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ziena:auth:rl',
  });
}

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const key = req.ip || 'unknown';

  if (upstashRl) {
    upstashRl.limit(key).then(({ success }) => {
      if (!success) { res.status(429).json({ error: 'طلبات كثيرة، حاول لاحقاً' }); return; }
      next();
    }).catch(() => next());
    return;
  }

  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    next(); return;
  }
  entry.count++;
  if (entry.count > 10) { res.status(429).json({ error: 'طلبات كثيرة، حاول لاحقاً' }); return; }
  next();
}

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use((req, res, next) => {
  const origin = isProd ? (ALLOWED_ORIGIN || req.headers.origin || '') : 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          rateLimitMiddleware, authRouter);
app.use('/api/providers',     providersRouter);
app.use('/api/services',      servicesRouter);
app.use('/api/bookings',      bookingsRouter);
app.use('/api/conversations', messagesRouter);
app.use('/api/wallet',        walletRouter);
app.use('/api/reviews',       reviewsRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/payments',      paymentsRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── .NET proxy ──────────────────────────────────────────────────────────────
const DOTNET_ORIGIN = process.env.DOTNET_API_URL || 'http://localhost:5000';
app.use('/dotnet-api', async (req, res) => {
  try {
    const upstream = await fetch(`${DOTNET_ORIGIN}${req.url}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD', 'DELETE'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').end(text);
  } catch (e: any) {
    res.status(502).json({ error: 'خادم زينة .NET غير متاح', detail: e.message });
  }
});

// ─── Static frontend (Render production) ─────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/dotnet-api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ─── Sentry error handler (must be after all routes) ─────────────────────────
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler());
}

export default app;
