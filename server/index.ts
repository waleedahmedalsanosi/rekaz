/**
 * server/index.ts — long-lived server entry point (Render, local dev).
 * Calls initDB() then starts listening. Not used on Vercel.
 */
import 'dotenv/config';
import app from './app.js';
import { initDB } from './db.js';

const PORT = process.env.PORT || 3001;

console.log('🔗 TURSO_URL:', process.env.TURSO_URL || '(not set — using file:zeina.db)');
console.log('🔑 TURSO_TOKEN:', process.env.TURSO_TOKEN ? `set (${process.env.TURSO_TOKEN.length} chars)` : '(not set)');

initDB()
  .then(() => {
    console.log('✅ Database ready');
    app.listen(PORT, () => {
      console.log(`🚀 Ziena API running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database init failed:', err.message);
    process.exit(1);
  });
