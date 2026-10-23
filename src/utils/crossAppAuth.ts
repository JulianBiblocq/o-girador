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
import { generateSsoRedirectHtml } from './crossAppRedirectHtml';

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
          newTab.document.write(generateSsoRedirectHtml(appLabel));
        } catch (_) {
          // Contexte de securite strict
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
