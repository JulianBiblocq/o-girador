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
  if (targetView && ['roda', 'console', 'timeline', 'admin', 'landing', 'home'].includes(targetView)) {
    return targetView as ViewMode;
  }
  if (urlParams.has('loadPreset') || urlParams.has('loadPattern') || urlParams.has('presetId') || urlParams.has('trainingId')) {
    return 'roda';
  }

  // 2. Détection synchrone du mode PWA autonome
  const isStandalonePwa =
    typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone)
    );

  if (isStandalonePwa) {
    return 'roda';
  }

  // 3. Utilisateur connecté ou ayant déjà vu l'accueil
  const hasSeenWelcome = localStorage.getItem('ogirador_has_seen_welcome') === 'true';
  const hasFirebaseAuthSession = Object.keys(localStorage).some((key) =>
    key.startsWith('firebase:authUser:')
  );

  if (hasSeenWelcome || hasFirebaseAuthSession) {
    return 'roda';
  }

  // 4. Première visite sans compte connecté
  return 'landing';
}
