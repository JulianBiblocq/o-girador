export async function applyServiceWorkerReload(reg?: ServiceWorkerRegistration | null): Promise<void> {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        if ((key.includes('workbox') && !key.includes('-precache-')) || key.includes('o-girador')) {
          await caches.delete(key);
        } else if (key === 'audio-samples-cache') {
          const sampleCache = await caches.open(key);
          const reqs = await sampleCache.keys();
          for (const req of reqs) {
            const resp = await sampleCache.match(req);
            const ct = (resp?.headers.get('content-type') || '').toLowerCase();
            if (!resp || resp.status !== 200 || ct.includes('text/html')) {
              await sampleCache.delete(req);
            }
          }
        }
      }
    }
  } catch (_) {}

  if (reg && reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch (_) {}
    setTimeout(() => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    }, 150);
  }
}
