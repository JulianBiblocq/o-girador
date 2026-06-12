/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'baquemix-cache-v32';

// Core static files to cache immediately on SW install
const STATIC_ASSETS = [
  './',
  './index.html',
  './favicon.ico',
  './favicon.svg',
  './favicon-32x32.png',
  './favicon-16x16.png',
  './apple-touch-icon.png',
  './manifest.json',
  './fonts/Cactus Regular.otf'
];

// Install Event: cache core static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean older cache versions
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: intercept requests and serve from cache or fetch and update cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Intercept requests targeting our own domain/origin
  if (url.origin === self.location.origin) {
    const path = url.pathname;

    // Explicitly bypass cache for version check
    if (path.includes('version.json')) {
      e.respondWith(fetch(e.request));
      return;
    }

    // 1. Cache-First for highly static assets (audio, fonts, icons, images)
    if (
      path.includes('/sons-maracatu/') ||
      path.includes('/icones/') ||
      path.includes('/fonts/') ||
      path.endsWith('.png') ||
      path.endsWith('.ico') ||
      path.endsWith('.svg') ||
      path.endsWith('.otf')
    ) {
      e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(e.request).then((networkResponse) => {
            // Check if valid response to cache
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse.clone());
              return networkResponse;
            });
          }).catch(() => {
            return new Response('Offline resource not cached', { status: 404 });
          });
        })
      );
    } else {
      // 2. Stale-While-Revalidate for app code (HTML, JS, CSS, presets JSON)
      e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
          const CURRENT_VERSION = 32; // Matches version.json
          const fetchPromise = fetch(e.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              return caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, networkResponse.clone());
                return networkResponse;
              });
            }
            return networkResponse;
          }).catch(() => {
            // Silently fallback if offline
            return cachedResponse;
          });

          return cachedResponse || fetchPromise;
        })
      );
    }
  }
});
