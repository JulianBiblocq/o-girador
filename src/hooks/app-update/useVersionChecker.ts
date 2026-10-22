/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { applyServiceWorkerReload } from './swReloadHelper';

export const CURRENT_VERSION = "1.0.9";
export const HAS_SEEN_UPDATE_KEY = `has_seen_update_${CURRENT_VERSION}`;

interface UseVersionCheckerParams {
  confirmAsync: (msg: string) => Promise<boolean>;
  lang: 'fr' | 'pt';
  setIsUpdateAvailable: (v: boolean) => void;
}

export function useVersionChecker({ confirmAsync, lang, setIsUpdateAvailable }: UseVersionCheckerParams) {
  useEffect(() => {
    let hasChecked = false;

    const checkVersion = async () => {
      if (hasChecked || !navigator.onLine) return;
      hasChecked = true;
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
                const sessionKey = `update_prompted_${latestVersion}`;
                if (sessionStorage.getItem(sessionKey)) return;
                sessionStorage.setItem(sessionKey, 'true');

                setIsUpdateAvailable(true);
                const shouldUpdate = await confirmAsync(
                  lang === 'fr'
                    ? "Une nouvelle version de O Girador est disponible. Recharger pour mettre à jour ?"
                    : "Uma nova versão do O Girador está disponível. Recarregar para atualizar ?"
                );
                if (shouldUpdate) {
                  await applyServiceWorkerReload();
                }
              }
            }
          }
        }
      } catch (_) {}
    };

    const initialTimer = setTimeout(checkVersion, 5000);
    window.addEventListener('online', checkVersion);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkVersion();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('online', checkVersion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [confirmAsync, lang, setIsUpdateAvailable]);
}
