import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
