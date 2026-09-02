/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ComponentType, LazyExoticComponent } from 'react';

/**
 * Encapsule React.lazy avec une détection automatique des erreurs de chargement de chunk
 * (ex: suite à un nouveau déploiement où l'ancien hash JS n'existe plus sur le serveur).
 * 
 * En cas d'erreur de module dynamique ou de type MIME text/html :
 * 1. Purge les caches et désenregistre le Service Worker obsolète.
 * 2. Déclenche un rechargement propre de la page (une seule fois par session / 15 secondes).
 * 3. Si le rechargement a déjà eu lieu récemment, relance l'erreur vers l'ErrorBoundary pour éviter toute boucle infinie.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>,
  name?: string
): LazyExoticComponent<T> {
  return React.lazy(async () => {
    const componentKey = `chunk_retry_${name || 'component'}`;

    try {
      const module = await componentImport();
      // Succès : réinitialiser le verrou pour de futurs déploiements
      try {
        sessionStorage.removeItem(componentKey);
      } catch {
        // Ignorer les erreurs d'accès à sessionStorage (ex: mode navigation privée très restreint)
      }
      return module;
    } catch (error: any) {
      const errorMsg = String(error?.message || error || '').toLowerCase();
      const isChunkLoadError =
        errorMsg.includes('dynamically imported module') ||
        errorMsg.includes('failed to load module script') ||
        errorMsg.includes('mime type of "text/html"') ||
        errorMsg.includes('text/html') ||
        errorMsg.includes('loading chunk') ||
        error?.name === 'ChunkLoadError';

      if (isChunkLoadError && typeof window !== 'undefined') {
        const lastReload = parseInt(sessionStorage.getItem(componentKey) || '0', 10);
        const now = Date.now();

        // Si aucun rechargement n'a eu lieu dans les 15 dernières secondes pour ce composant
        if (now - lastReload > 15_000) {
          sessionStorage.setItem(componentKey, String(now));
          console.warn(`[lazyWithRetry] Stale chunk detected for ${name || 'module'}. Purging caches and reloading...`);

          try {
            if ('caches' in window) {
              const keys = await caches.keys();
              for (const key of keys) {
                if (key.includes('workbox') || key.includes('o-girador')) {
                  await caches.delete(key);
                }
              }
            }
          } catch {
            // Silencieux sur l'effacement du cache
          }

          try {
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const reg of registrations) {
                await reg.unregister();
              }
            }
          } catch {
            // Silencieux sur le désenregistrement du service worker
          }

          window.location.reload();

          // Retourner une promesse suspendue en attendant que la page se recharge
          return new Promise<{ default: T }>(() => {});
        }
      }

      // Si le rechargement n'a pas résolu le problème (ou autre type d'erreur), relancer l'erreur
      throw error;
    }
  });
}
