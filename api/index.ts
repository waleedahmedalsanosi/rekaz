/**
 * api/index.ts — Vercel serverless adapter.
 *
 * Vercel routes all /api/* and /dotnet-api/* requests here (see vercel.json).
 * The Express app is exported as the default handler — Vercel wraps it in
 * a serverless function automatically.
 *
 * On cold start, initDB() is called once per function instance.
 * Because TURSO_URL points to a remote DB, this is just a connection setup;
 * no local file system is needed. Do NOT set TURSO_URL to a file: URL on Vercel.
 */
import { initDB } from '../server/db.js';
import app from '../server/app.js';

// Initialise DB on cold start (safe to call multiple times — idempotent).
await initDB();

export default app;
