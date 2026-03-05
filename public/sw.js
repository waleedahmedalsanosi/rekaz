// Ziena — Web Push Service Worker
// Handles background push notifications from the .NET backend.

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { /* ignore */ }

  const title   = data.title  || 'زينة';
  const options = {
    body:    data.body  || '',
    icon:    data.icon  || '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    dir:     'rtl',
    lang:    'ar',
    vibrate: [200, 100, 200],
    data:    { url: '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
