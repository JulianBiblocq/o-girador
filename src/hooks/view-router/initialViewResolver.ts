/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ViewMode =
  | 'landing'
  | 'home'
  | 'roda'
  | 'console'
  | 'timeline'
  | 'admin';

export function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'landing';

  // 1. URL Deep Linking / parameters
  const urlParams = new URLSearchParams(window.location.search);
  const targetView = urlParams.get('view');
  if (targetView === 'landing' || targetView === 'home') {
    return targetView;
  }
  if (targetView && ['roda', 'console', 'timeline', 'admin'].includes(targetView)) {
    return targetView as ViewMode;
  }

  // Sauter l'accueil si paramètre d'action directe
  const hasDirectAction =
    urlParams.has('loadPreset') ||
    urlParams.has('loadPattern') ||
    urlParams.has('presetId') ||
    urlParams.has('trainingId') ||
    urlParams.has('mode') ||
    urlParams.has('tocarJunto');

  if (hasDirectAction) {
    return 'roda';
  }

  // 2. Détection synchrone du mode PWA autonome
  const isStandalonePwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as any).standalone);

  if (isStandalonePwa) {
    return 'roda';
  }

  // 3. Utilisateur déjà authentifié (session Firebase active ou ssoToken entrant)
  const hasSsoToken = urlParams.has('ssoToken') || urlParams.has('token');
  const hasFirebaseAuthSession = Object.keys(localStorage).some((key) =>
    key.startsWith('firebase:authUser:')
  );

  if (hasSsoToken || hasFirebaseAuthSession) {
    return 'roda';
  }

  // 4. Visiteur ayant déjà validé la page d'accueil
  const hasSeenWelcome = localStorage.getItem('ogirador_has_seen_welcome') === 'true';
  if (hasSeenWelcome) {
    return 'roda';
  }

  // 5. Première visite sans compte connecté
  return 'landing';
}
