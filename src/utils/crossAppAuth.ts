/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O-Girador - Cross-App SSO Navigation & Token Injector (Satellite -> Ecosystem)
 * 
 * Generates customToken enriched with user claims via getCrossAppAuthToken Cloud Function
 * and securely redirects to other satellite applications without session loss.
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebase/config';

export interface LaunchCrossAppOptions {
  appLabel?: string;
  forceSameTab?: boolean;
  appKey?: string | null;
}

export async function launchCrossApp(targetUrl: string, options: LaunchCrossAppOptions = {}): Promise<void> {
  const { appLabel = "l'application", forceSameTab = false, appKey = null } = options;

  if (!targetUrl) return;

  // Si non connecté ou cible publique vitrine / sans session requise, ouverture immédiate
  if (!auth.currentUser || appKey === 'mostrador') {
    if (forceSameTab) {
      window.location.href = targetUrl;
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    return;
  }

  // Pré-ouverture synchrone de l'onglet pour déjouer les bloqueurs de popups (Safari, Chrome Mobile)
  let newTab: Window | null = null;
  if (!forceSameTab) {
    try {
      newTab = window.open('about:blank', '_blank');
      if (newTab) {
        try {
          newTab.document.write(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>O-Girador - Connexion sécurisée...</title>
              <style>
                body {
                  margin: 0;
                  background-color: #fdfaf2;
                  color: #181716;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  text-align: center;
                  padding: 24px;
                  box-sizing: border-box;
                }
                .card {
                  background: #fdfaf2;
                  border: 2px solid #181716;
                  border-radius: 8px;
                  padding: 32px 24px;
                  box-shadow: 4px 4px 0px 0px #181716;
                  max-width: 380px;
                  width: 100%;
                }
                .spinner {
                  width: 40px;
                  height: 40px;
                  border: 3px solid rgba(24, 23, 22, 0.15);
                  border-top-color: #8b2a1a;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin: 0 auto 20px auto;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                h2 { margin: 0 0 10px 0; font-size: 1.15rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
                p { margin: 0; opacity: 0.75; font-size: 0.88rem; line-height: 1.4; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="spinner"></div>
                <h2>Redirection vers ${appLabel}</h2>
                <p>Authentification sécurisée de votre session en cours...</p>
              </div>
            </body>
            </html>
          `);
        } catch (_) {
          // Contexte de sécurité strict
        }
      }
    } catch (_) {
      newTab = null;
    }
  }

  try {
    const getSSOToken = httpsCallable<void, { token?: string; customToken?: string }>(functions, 'getCrossAppAuthToken');
    const res = await getSSOToken();
    const customToken = res.data?.token || res.data?.customToken;

    const urlObj = new URL(targetUrl, window.location.origin);
    if (customToken) {
      urlObj.searchParams.set('ssoToken', customToken);
    }
    const finalDestination = urlObj.toString();

    if (newTab && !newTab.closed) {
      try {
        newTab.location.href = finalDestination;
      } catch (_) {
        window.location.href = finalDestination;
      }
    } else {
      window.location.href = finalDestination;
    }
  } catch (error) {
    console.warn("[CrossApp SSO] Échec de récupération du token SSO, redirection directe :", error);
    if (newTab && !newTab.closed) {
      try {
        newTab.location.href = targetUrl;
      } catch (_) {
        window.location.href = targetUrl;
      }
    } else {
      window.location.href = targetUrl;
    }
  }
}

/**
 * Alias de compatibilité
 */
export const launchWithSSO = launchCrossApp;
