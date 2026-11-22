export type ViewMode =
  | 'landing'
  | 'home'
  | 'roda'
  | 'console'
  | 'timeline'
  | 'admin';

export function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'landing';

  // 1. URL Deep Linking / paramètres explicites
  const urlParams = new URLSearchParams(window.location.search);
  const targetView = (urlParams.get('view') || '').trim().toLowerCase();
  if (targetView === 'landing' || targetView === 'home') {
    return targetView;
  }
  if (targetView && ['roda', 'console', 'timeline', 'admin'].includes(targetView)) {
    return targetView as ViewMode;
  }
  if (targetView === 'lecture' || targetView === 'danse' || targetView === 'escuta') {
    return 'roda';
  }

  // Sauter l'accueil si paramètre d'action directe ou jeton SSO
  const hasDirectAction =
    urlParams.has('loadPreset') ||
    urlParams.has('presetId') ||
    urlParams.has('loadPattern') ||
    urlParams.has('loadToadaId') ||
    urlParams.has('mode') ||
    urlParams.has('tocarJunto') ||
    urlParams.has('trainingId') ||
    urlParams.has('guide') ||
    urlParams.has('ssoToken') ||
    urlParams.has('token') ||
    urlParams.has('train') ||
    urlParams.has('role') ||
    urlParams.has('targetTrack') ||
    urlParams.has('capture');

  if (hasDirectAction) {
    return 'roda';
  }

  // 2. Détection synchrone du mode PWA installée
  const isStandalonePwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalonePwa) {
    return 'roda';
  }

  // 3. Utilisateur déjà authentifié (session Firebase active)
  const hasFirebaseAuthSession = Object.keys(localStorage).some((key) =>
    key.startsWith('firebase:authUser:')
  );

  if (hasFirebaseAuthSession) {
    return 'roda';
  }

  // 4. Visiteur ayant déjà vu la page d'accueil
  if (localStorage.getItem('ogirador_has_seen_welcome') === 'true') {
    return 'roda';
  }

  // 5. Première visite web d'un non-connecté
  return 'landing';
}
