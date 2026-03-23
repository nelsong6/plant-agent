// Plant Agent — push-only service worker (no offline caching)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Plant Agent', {
      body: data.body || 'Your plants need attention!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/tasks' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// Activate immediately on update
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
