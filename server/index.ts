import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';

import authRouter from './routes/auth.js';
import providersRouter from './routes/providers.js';
import servicesRouter from './routes/services.js';
import bookingsRouter from './routes/bookings.js';
import messagesRouter from './routes/messages.js';
import walletRouter from './routes/wallet.js';
import reviewsRouter from './routes/reviews.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ─── In-memory rate limiter for auth endpoints ──────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(windowMs: number, maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'طلبات كثيرة، حاول لاحقاً' });
    }
    next();
  };
}
// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) if (now > v.resetAt) rateLimitMap.delete(k);
}, 5 * 60 * 1000);

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(express.json());

// CORS — in production only allow from the configured allowed origin
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use((req, res, next) => {
  let origin: string;
  if (isProd) {
    origin = ALLOWED_ORIGIN || req.headers.origin || '';
  } else {
    origin = 'http://localhost:3000';
  }
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Init DB ───────────────────────────────────────────────────────────────
console.log('🔗 TURSO_URL:', process.env.TURSO_URL || '(not set — using file:zeina.db)');
console.log('🔑 TURSO_TOKEN:', process.env.TURSO_TOKEN ? `set (${process.env.TURSO_TOKEN.length} chars)` : '(not set)');
initDB().then(() => {
  console.log('✅ Database ready');
}).catch(err => {
  console.error('❌ Database init failed:', err.message);
  process.exit(1);
});

// ─── Routes ───────────────────────────────────────────────────────────────
// Auth: 10 requests per minute per IP
app.use('/api/auth', rateLimit(60_000, 10), authRouter);
app.use('/api/providers', providersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/conversations', messagesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── .NET proxy ────────────────────────────────────────────────────────────
// Forwards /dotnet-api/* → .NET backend (runtime env DOTNET_API_URL).
// In dev Vite handles this; in production Express proxies directly.
const DOTNET_ORIGIN = process.env.DOTNET_API_URL || 'http://localhost:5000';
app.use('/dotnet-api', async (req, res) => {
  const url = `${DOTNET_ORIGIN}${req.url}`;
  try {
    const upstream = await fetch(url, {
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

// ─── Serve frontend in production ─────────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // Only serve index.html for SPA routes — never for API or proxy paths
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/dotnet-api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Zeina API server running on http://localhost:${PORT}`);
});
