// --- START OF FILE sw.js ---

const VERSION = '3.0.1'; // Version matches your app version
const APP_PREFIX = 'cuet-command-center'; // Unique prefix for this app's caches
const CACHE_NAME = `${APP_PREFIX}-v${VERSION}`;

// --- CRITICAL: List of all files needed for the app shell to work offline ---
const STATIC_CACHE_URLS = [
  './', // Caches the root, which serves index.html
  './index.html', // The main app shell
  './manifest.webmanifest', // The PWA manifest
  './icon-192x192.png', // Main PWA icon
  './icon-512x512.png', // Larger PWA icon
  './icon-maskable-512x512.png', // Maskable icon (optional but recommended)
  // --- External Dependencies (MUST be cached for offline to work) ---
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.2.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  // Font Awesome's webfonts are loaded by its CSS file, so we need to cache them too.
  // The service worker will automatically cache these when it fetches the CSS above.
];

// --- INSTALL: Cache the app shell ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[Service Worker] Installing v${VERSION}: Caching App Shell...`);
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete caches that belong to this app but are not the current version.
          if (cacheName.startsWith(APP_PREFIX) && cacheName !== CACHE_NAME) {
            console.log(`[Service Worker] Activating: Deleting old cache ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`[Service Worker] v${VERSION} Activated and old caches cleaned.`);
      // Take control of all open clients (tabs) immediately.
      return self.clients.claim();
    })
  );
});

// --- FETCH: Serve from cache or network ---
self.addEventListener('fetch', event => {
  // Ignore non-GET requests and requests for browser extensions.
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Use a "Cache, falling back to Network" strategy.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. If we have a cached response, return it immediately.
        if (cachedResponse) {
          // console.log(`[Service Worker] Fetch: Returning ${event.request.url} from cache.`);
          return cachedResponse;
        }

        // 2. If not in cache, fetch from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response.
            // We only cache successful (2xx) responses.
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and can only be consumed once. We need one for the browser
            // and one for the cache.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log(`[Service Worker] Fetch: Caching new resource: ${event.request.url}`);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(() => {
          // 3. If the network request fails (e.g., user is offline):
          // This is crucial for SPA offline functionality.
          if (event.request.mode === 'navigate') {
            console.log('[Service Worker] Fetch: Navigate request failed, returning offline page.');
            // Return the main app shell for any navigation request.
            return caches.match('./index.html');
          }
          // For other failed requests (images, etc.), they will just fail naturally.
          // You could return a placeholder image here if desired.
        });
      })
  );
});

// --- END OF FILE sw.js ---
