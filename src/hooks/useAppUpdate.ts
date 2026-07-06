/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useSequencer } from '../contexts/SequencerContext';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const CURRENT_VERSION = "3.1.2"; // Matches version.json
export const HAS_SEEN_UPDATE_KEY = `has_seen_update_${CURRENT_VERSION}`;

export function useAppUpdate() {
  const sequencer = useSequencer();
  const { confirmAsync } = sequencer;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // A2HS install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        // App installed by user
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // SW Update Handler
  const handleAppUpdate = useCallback(async (reg: ServiceWorkerRegistration) => {
    setIsUpdateAvailable(true);
    setWaitingRegistration(reg);

    const shouldUpdate = await confirmAsync(
      sequencer.lang === 'fr'
        ? "Une nouvelle version de O Girador est disponible. Recharger pour mettre à jour ?"
        : "Uma nova versão do O Girador está disponível. Recarregar para atualizar ?"
    );
    if (shouldUpdate) {
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
            if (key.includes('workbox') || key.includes('o-girador')) {
              await caches.delete(key);
            }
          }
        }
      } catch (err) {
        // console.warn('Error clearing caches:', err);
      }
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (err) {
          // console.warn('Error unregistering service workers:', err);
        }
        window.location.reload();
      }
    }
  }, [confirmAsync, sequencer.lang]);

  // Manual update application trigger
  const applyUpdate = useCallback(async () => {
    const reg = waitingRegistration;
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
          if (key.includes('workbox') || key.includes('o-girador')) {
            await caches.delete(key);
          }
        }
      }
    } catch (err) {
      // console.warn('Error clearing caches:', err);
    }
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (err) {
        // console.warn('Error unregistering service workers:', err);
      }
      window.location.reload();
    }
  }, [waitingRegistration]);

  useEffect(() => {
    const handleSWUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
      handleAppUpdate(customEvent.detail);
    };
    window.addEventListener('sw-update-available', handleSWUpdateEvent);
    return () => window.removeEventListener('sw-update-available', handleSWUpdateEvent);
  }, [handleAppUpdate]);

  // 🛡️ FIX (Audit P1): Event-driven version check instead of aggressive 3s polling
  useEffect(() => {
    let hasChecked = false; // Debounce guard to avoid multiple rapid checks

    const checkVersion = async () => {
      if (hasChecked || !navigator.onLine) return;
      hasChecked = true;
      // Reset debounce after 60 seconds to allow future checks
      setTimeout(() => { hasChecked = false; }, 60_000);

      try {
        const basePath = window.location.pathname.endsWith('/')
          ? window.location.pathname
          : window.location.pathname + '/';
        const response = await fetch(`${basePath}version.json?t=${Date.now()}`);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data && typeof data === 'object' && 'version' in data) {
              const latestVersion = String(data.version);
              if (latestVersion && latestVersion !== 'undefined' && latestVersion !== CURRENT_VERSION) {
                setIsUpdateAvailable(true);
                const shouldUpdate = await confirmAsync(
                  sequencer.lang === 'fr'
                    ? "Une nouvelle version de O Girador est disponible. Recharger pour mettre à jour ?"
                    : "Uma nova versão do O Girador está disponível. Recarregar para atualizar ?"
                );
                if (shouldUpdate) {
                  let refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) { refreshing = true; window.location.reload(); }
                  });
                  try {
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const key of keys) {
                        if (key.includes('workbox') || key.includes('o-girador')) {
                          await caches.delete(key);
                        }
                      }
                    }
                  } catch {}
                  try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) await reg.unregister();
                  } catch {}
                  window.location.reload();
                }
              }
            }
          }
        }
      } catch { /* silencieux hors ligne */ }
    };

    // 1. Check 5s after initial load (after TTI)
    const initialTimer = setTimeout(checkVersion, 5000);

    // 2. Check when device comes back online
    window.addEventListener('online', checkVersion);

    // 3. Check when tab/app regains focus
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkVersion();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('online', checkVersion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [confirmAsync, sequencer.lang]);

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt,
    isUpdateAvailable,
    handleInstallClick,
    applyUpdate,
  };
}
