let wakeLockSentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
  } catch (_) {
    // Wake Lock request failed (e.g. low battery, permission denied)
  }
}

export function releaseWakeLock(): void {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}
