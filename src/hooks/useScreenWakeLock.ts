/**
 * Empêche l'écran du mobile de se mettre en veille pendant la lecture audio (< 65 lignes).
 */

import { useEffect, useRef } from 'react';

export function useScreenWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function requestWakeLock() {
      if (!('wakeLock' in navigator) || wakeLockRef.current) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current?.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (_) {
        wakeLockRef.current = null;
      }
    }

    async function releaseWakeLock() {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch (_) {}
        wakeLockRef.current = null;
      }
    }

    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && isMounted) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isActive]);
}
