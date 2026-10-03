// RemoteOne PWA Service Worker
const CACHE_NAME = 'remoteone-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './assets/icons/icon.svg',
  './app.js',
  './src/core/StorageManager.js',
  './src/core/DeviceManager.js',
  './src/core/ConnectionManager.js',
  './src/core/CommandManager.js',
  './src/core/DiscoveryManager.js',
  './src/devices/roku/RokuCommands.js',
  './src/devices/roku/RokuDriver.js',
  './src/devices/roku/RokuDiscovery.js',
  './src/devices/xiaomi/XiaomiCommands.js',
  './src/devices/xiaomi/XiaomiDriver.js',
  './src/devices/xiaomi/XiaomiDiscovery.js',
  './src/utils/Logger.js',
  './src/utils/ErrorHandler.js',
  './src/utils/NetworkUtils.js',
  './src/ui/HomeView.js',
  './src/ui/RemoteView.js',
  './src/ui/DeviceSetupView.js',
  './src/ui/FavoritesView.js',
  './src/ui/SettingsView.js',
  './src/ui/DiagnosticView.js',
  './src/ui/CompatibilityView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort caching
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never intercept local TV / bridge network commands
  const url = new URL(event.request.url);
  if (url.port === '8060' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/keypress/') || url.pathname.startsWith('/query/')) {
    return; // Pass through directly to local network
  }

  // Network-first with cache fallback for app shell
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline - RemoteOne', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
