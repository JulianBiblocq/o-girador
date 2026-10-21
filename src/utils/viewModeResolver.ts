/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useSequencerStore } from '../stores/useSequencerStore';
import type { UserProfile } from '../contexts/auth/authTypes';

export type MobileViewMode = 'danse' | 'percussion' | 'editeur' | 'complet';

export const MOBILE_VIEW_MODE_STORAGE_KEY = 'sequenciador_last_view_mode';

export function hasDirectModeUrlParam(): boolean {
  if (typeof window === 'undefined') return false;
  const p = new URLSearchParams(window.location.search);
  return (
    p.has('mode') ||
    p.has('view') ||
    p.has('tocarJunto') ||
    p.has('trainingId') ||
    p.has('role')
  );
}

export function persistMobileViewModeLocally(mode: MobileViewMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOBILE_VIEW_MODE_STORAGE_KEY, mode);
  } catch (_) {}
}

export function persistMobileViewMode(mode: MobileViewMode): void {
  persistMobileViewModeLocally(mode);

  try {
    const uid = auth.currentUser?.uid;
    if (uid) {
      const userRef = doc(db, 'users', uid);
      setDoc(userRef, { lastSequenciadorMode: mode }, { merge: true }).catch((err) => {
        console.warn('[viewModeResolver] Erreur sync Firestore lastSequenciadorMode:', err);
      });
    }
  } catch (err) {
    console.warn('[viewModeResolver] Erreur sauvegarde mode Firestore:', err);
  }
}

export function getInitialMobileViewMode(): MobileViewMode {
  if (typeof window === 'undefined') return 'complet';

  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = (urlParams.get('mode') || '').toLowerCase();
  const viewParam = (urlParams.get('view') || '').toLowerCase();

  // PRIORITÉ 1 — Lien explicite dans l'URL
  if (modeParam === 'danse' || viewParam === 'danse') {
    persistMobileViewModeLocally('danse');
    return 'danse';
  }

  if (
    modeParam === 'percussion' ||
    urlParams.get('tocarJunto') === '1' ||
    urlParams.has('tocarJunto') ||
    urlParams.has('trainingId') ||
    urlParams.has('role')
  ) {
    persistMobileViewModeLocally('percussion');
    return 'percussion';
  }

  if (modeParam === 'editeur' || modeParam === 'edition') {
    persistMobileViewModeLocally('editeur');
    return 'editeur';
  }

  if (modeParam === 'complet' || modeParam === 'studio') {
    persistMobileViewModeLocally('complet');
    return 'complet';
  }

  // PRIORITÉ 2 — Mémoire de l'utilisateur (sequenciador_last_view_mode)
  try {
    const saved = localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY);
    if (saved === 'danse' || saved === 'percussion' || saved === 'editeur' || saved === 'complet') {
      return saved;
    }
  } catch (_) {}

  // PRIORITÉ 3 — Primo-arrivée sans mémoire (défaut après Landing Page)
  return 'complet';
}

export function resolveDefaultModeFromProfile(profile: UserProfile): MobileViewMode {
  const role = (profile.dbRole || profile.role || '').toLowerCase();
  const inst = (profile.instrument || '').toLowerCase();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (role === 'mestre' || role === 'mestri' || Boolean(profile.canWriteSequenciador)) {
    return isMobile ? 'editeur' : 'complet';
  }

  const isDanseur =
    role.includes('danse') ||
    inst.includes('danse') ||
    Boolean(profile.canWriteDansador) ||
    Boolean(profile.hasDancaAccess);

  if (isDanseur) return 'danse';

  const isPercussion =
    role.includes('percu') ||
    role === 'eleve' ||
    role === 'membre' ||
    (Boolean(inst) && !inst.includes('danse'));

  if (isPercussion) return 'percussion';

  return 'complet';
}

export function syncMobileViewModeWithProfile(profile: UserProfile | null | undefined): void {
  if (!profile || typeof window === 'undefined') return;

  // Priorité absolue à l'URL : ne jamais écraser un lien ciblé
  if (hasDirectModeUrlParam()) return;

  const currentStoreMode = useSequencerStore.getState().mobileViewMode;

  if (profile.lastSequenciadorMode) {
    const cloudMode = profile.lastSequenciadorMode;
    if (['danse', 'percussion', 'editeur', 'complet'].includes(cloudMode)) {
      if (currentStoreMode !== cloudMode) {
        useSequencerStore.getState().setMobileViewMode(cloudMode);
      }
      persistMobileViewModeLocally(cloudMode);
      return;
    }
  }

  const savedLocal = localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY);
  if (!savedLocal) {
    const resolved = resolveDefaultModeFromProfile(profile);
    useSequencerStore.getState().setMobileViewMode(resolved);
  }
}
