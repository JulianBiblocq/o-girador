
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
