/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'baquemix-cache-v2.5';

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
  './Mixdown/Apito W long.ogg',
  './Mixdown/Apito w court.ogg',

  './Mixdown/Agbe A 1.ogg',
  './Mixdown/Agbe A 2.ogg',
  './Mixdown/Agbe B.ogg',
  './Mixdown/Agbe f 1.ogg',
  './Mixdown/Agbe f 2.ogg',
  './Mixdown/Agbe f 3.ogg',
  './Mixdown/Agbe f 4.ogg',
  './Mixdown/Agbe F D 1.ogg',
  './Mixdown/Agbe F D 2.ogg',
  './Mixdown/Agbe F D 3.ogg',
  './Mixdown/Agbe F D 4.ogg',
  './Mixdown/Agbe F E 1.ogg',
  './Mixdown/Agbe F E 2.ogg',
  './Mixdown/Agbe F E 3.ogg',
  './Mixdown/Agbe F E 4.ogg',
  './Mixdown/Agbe S 1.ogg',
  './Mixdown/Agbe S 2.ogg',

  './Mixdown/Alfaia meiao B.ogg',
  './Mixdown/Alfaia meiao C 1.ogg',
  './Mixdown/Alfaia meiao C 2.ogg',
  './Mixdown/Alfaia meiao F 1.ogg',
  './Mixdown/Alfaia meiao F 2.ogg',
  './Mixdown/Alfaia meiao F 3.ogg',
  './Mixdown/Alfaia meiao F 4.ogg',
  './Mixdown/Alfaia meiao F 5.ogg',
  './Mixdown/Alfaia meiao F 6.ogg',
  './Mixdown/Alfaia meiao faible 1.ogg',
  './Mixdown/Alfaia meiao faible 2.ogg',
  './Mixdown/Alfaia meiao faible 3.ogg',
  './Mixdown/Alfaia meiao faible 4.ogg',
  './Mixdown/Alfaia meiao I 1.ogg',
  './Mixdown/Alfaia meiao I 2.ogg',
  './Mixdown/Alfaia meiao X 1.ogg',
  './Mixdown/Alfaia meiao X 2.ogg',

  './Mixdown/Caixa B.ogg',
  './Mixdown/Caixa C 1.ogg',
  './Mixdown/Caixa C 2.ogg',
  './Mixdown/Caixa F 1.ogg',
  './Mixdown/Caixa F 2.ogg',
  './Mixdown/Caixa F 3.ogg',
  './Mixdown/Caixa F 4.ogg',
  './Mixdown/Caixa faible 1.ogg',
  './Mixdown/Caixa faible 2.ogg',
  './Mixdown/Caixa faible 3.ogg',
  './Mixdown/Caixa faible 4.ogg',
  './Mixdown/Caixa Fla 1.ogg',
  './Mixdown/Caixa Fla 2.ogg',
  './Mixdown/Caixa R 1.ogg',
  './Mixdown/Caixa R 2.ogg',
  './Mixdown/Caixa X.ogg',

  './Mixdown/Gongue A 1.ogg',
  './Mixdown/Gongue A 2.ogg',
  './Mixdown/Gongue A 3.ogg',
  './Mixdown/Gongue A 4.ogg',
  './Mixdown/Gongue B.ogg',
  './Mixdown/Gongue C 1.ogg',
  './Mixdown/Gongue C 2.ogg',
  './Mixdown/Gongue f a 1.ogg',
  './Mixdown/Gongue f a 2.ogg',
  './Mixdown/Gongue f a 3.ogg',
  './Mixdown/Gongue f a 4.ogg',
  './Mixdown/Gongue f g 1.ogg',
  './Mixdown/Gongue f g 2.ogg',
  './Mixdown/Gongue f g 3.ogg',
  './Mixdown/Gongue f g 4.ogg',
  './Mixdown/Gongue G 1.ogg',
  './Mixdown/Gongue G 2.ogg',
  './Mixdown/Gongue G 3.ogg',
  './Mixdown/Gongue G 4.ogg',

  './Mixdown/Mineiro B.ogg',
  './Mixdown/Mineiro f 1.ogg',
  './Mixdown/Mineiro f 2.ogg',
  './Mixdown/Mineiro f 3.ogg',
  './Mixdown/Mineiro f 4.ogg',
  './Mixdown/Mineiro F P 1.ogg',
  './Mixdown/Mineiro F P 2.ogg',
  './Mixdown/Mineiro F P 3.ogg',
  './Mixdown/Mineiro F P 4.ogg',
  './Mixdown/Mineiro F T 1.ogg',
  './Mixdown/Mineiro F T 2.ogg',
  './Mixdown/Mineiro F T 3.ogg',
  './Mixdown/Mineiro F T 4.ogg',
  './Mixdown/Mineiro L 1.ogg',
  './Mixdown/Mineiro L 2.ogg',
  './Mixdown/Mineiro L 3.ogg',
  './Mixdown/Mineiro L 4.ogg',

  './Mixdown/Tarol B.ogg',
  './Mixdown/Tarol C 1.ogg',
  './Mixdown/Tarol C 2.ogg',
  './Mixdown/Tarol F1.ogg',
  './Mixdown/Tarol F 2.ogg',
  './Mixdown/Tarol F 3.ogg',
  './Mixdown/Tarol F 4.ogg',
  './Mixdown/Tarol faible 1.ogg',
  './Mixdown/Tarol faible 2.ogg',
  './Mixdown/Tarol faible 3.ogg',
  './Mixdown/Tarol faible 4.ogg',
  './Mixdown/Tarol Fla 1.ogg',
  './Mixdown/Tarol Fla 2.ogg',
  './Mixdown/Tarol R 1.ogg',
  './Mixdown/Tarol R 2.ogg',
  './Mixdown/Tarol X.ogg'
];

// Preset JSON files to cache immediately for offline usage
const PRESET_ASSETS = [
  './presets/catalog.json',
  './presets/Baque de Imale.json',
  './presets/Baque_de_Luanda.json',
  './presets/Pitomba.json',
  './presets/Vovo_falou.json',
  './presets/Vou vadiar carnaval.json',
  './presets/_convencao_2.json'
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
      path.includes('/Mixdown/') ||
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
