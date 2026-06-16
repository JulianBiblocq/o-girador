/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'baquemix-cache-v2.3';

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

// Audio files to cache immediately for offline usage
const AUDIO_ASSETS = [
  './sons-maracatu/Apito.wav',
  './sons-maracatu/Agbe/barulho.wav',
  './sons-maracatu/Agbe/faible.wav',
  './sons-maracatu/Agbe/fort.wav',
  './sons-maracatu/Agbe/saut.wav',

  './sons-maracatu/Alfaia/Marcante/barulho.wav',
  './sons-maracatu/Alfaia/Marcante/cerclage.wav',
  './sons-maracatu/Alfaia/Marcante/click.wav',
  './sons-maracatu/Alfaia/Marcante/faible.wav',
  './sons-maracatu/Alfaia/Marcante/fort.wav',
  './sons-maracatu/Alfaia/Marcante/iguarassu.wav',

  './sons-maracatu/Alfaia/Meiao/barulho.wav',
  './sons-maracatu/Alfaia/Meiao/cerclage.wav',
  './sons-maracatu/Alfaia/Meiao/click.wav',
  './sons-maracatu/Alfaia/Meiao/faible.wav',
  './sons-maracatu/Alfaia/Meiao/fort.wav',
  './sons-maracatu/Alfaia/Meiao/iguarassu.wav',

  './sons-maracatu/Alfaia/Repique/barulho.wav',
  './sons-maracatu/Alfaia/Repique/cerclage.wav',
  './sons-maracatu/Alfaia/Repique/click.wav',
  './sons-maracatu/Alfaia/Repique/faible.wav',
  './sons-maracatu/Alfaia/Repique/fort.wav',
  './sons-maracatu/Alfaia/Repique/iguarassu.wav',

  './sons-maracatu/Caixa/Caixa-barulho.wav',
  './sons-maracatu/Caixa/Caixa-cerclage.wav',
  './sons-maracatu/Caixa/Caixa-fla.wav',
  './sons-maracatu/Caixa/Caixa-ruffada-D.wav',
  './sons-maracatu/Caixa/Caixa-ruffada-G.wav',
  './sons-maracatu/Caixa/faible.wav',
  './sons-maracatu/Caixa/fort.wav',

  './sons-maracatu/Gongue/Gongue-barulho.wav',
  './sons-maracatu/Gongue/faible-aigue.wav',
  './sons-maracatu/Gongue/faible-grave.wav',
  './sons-maracatu/Gongue/fort-aigue.wav',
  './sons-maracatu/Gongue/fort-grave.wav',

  './sons-maracatu/Mineiro/faible.wav',
  './sons-maracatu/Mineiro/fort.wav',

  './sons-maracatu/Tarol/Tarol cerclage x.wav',
  './sons-maracatu/Tarol/Tarol click c1.wav',
  './sons-maracatu/Tarol/Tarol click c2.wav',
  './sons-maracatu/Tarol/Tarol faible d1.wav',
  './sons-maracatu/Tarol/Tarol faible d2.wav',
  './sons-maracatu/Tarol/Tarol faible d3.wav',
  './sons-maracatu/Tarol/Tarol faible d4.wav',
  './sons-maracatu/Tarol/Tarol fla1.wav',
  './sons-maracatu/Tarol/Tarol fla2.wav',
  './sons-maracatu/Tarol/Tarol fort D1.wav',
  './sons-maracatu/Tarol/Tarol fort D2.wav',
  './sons-maracatu/Tarol/Tarol fort D3.wav',
  './sons-maracatu/Tarol/Tarol fort D4.wav',
  './sons-maracatu/Tarol/Tarol rufada1.wav',
  './sons-maracatu/Tarol/Tarol rufada2.wav',
  './sons-maracatu/Tarol/Tarol rufada3.wav',
  './sons-maracatu/Tarol/Tarol tremer.wav'
];

// Preset JSON files to cache immediately for offline usage
const PRESET_ASSETS = [
  './presets/catalog.json',
  './presets/Baque de Imale.json',
  './presets/Baque_de_Luanda.json',
  './presets/Pitomba.json',
  './presets/Vovo_falou.json',
  './presets/_Vou vadiar carnaval.json'
];

// Install Event: cache all core static assets, audio files, and presets
self.addEventListener('install', (e) => {
  const allAssets = [...STATIC_ASSETS, ...AUDIO_ASSETS, ...PRESET_ASSETS];
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(allAssets);
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
          const CURRENT_VERSION = "2.2"; // Matches version.json
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
