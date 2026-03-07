import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

// ── Sentry (error tracking) ────────────────────────────────────────────────
// Free plan: 5,000 errors/month. Set VITE_SENTRY_DSN in your build environment.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

// ── PostHog (product analytics) ───────────────────────────────────────────
// Free plan: 1M events/month. Set VITE_POSTHOG_KEY in your build environment.
// Tracks booking funnel, session replays, feature flags.
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,      // auto page-view events
    capture_pageleave: true,     // detect funnel drop-off
    autocapture: false,          // disable noisy click tracking; use manual events
    persistence: 'localStorage',
  });
}

// ── Service Worker registration ────────────────────────────────────────────
// Must happen before React renders so SW is ready when enableNotifications()
// calls navigator.serviceWorker.ready.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered, scope:', reg.scope))
      .catch(err => console.error('[SW] Registration failed:', err));
  });
}

// ── Global error interceptor ───────────────────────────────────────────────
// Logs full error details so the ACTUAL message is visible in the console
// instead of the generic Arabic toast text.
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Ziena] Unhandled rejection:', event.reason);
});
window.addEventListener('error', (event) => {
  console.error('[Ziena] Global error:', event.message, event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
