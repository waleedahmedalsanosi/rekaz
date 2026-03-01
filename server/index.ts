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

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(express.json());

// CORS
app.use((req, res, next) => {
  const origin = isProd ? req.headers.origin || '*' : 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Init DB ───────────────────────────────────────────────────────────────
initDB().then(() => {
  console.log('✅ Database ready');
}).catch(err => {
  console.error('❌ Database init failed:', err);
  process.exit(1);
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/providers', providersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/conversations', messagesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Serve frontend in production ─────────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Zeina API server running on http://localhost:${PORT}`);
});
