import type { UserProfile } from '../../contexts/auth/authTypes';
import { isStudioPrivilegedProfile } from '../../utils/viewModeResolver';
import { getStoredDesktopStartupMode } from '../../utils/userPreferencesStorage';

export function resolveDesktopUrlPracticeOverride(): boolean | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  const mode = (p.get('mode') || '').toLowerCase();
  const view = (p.get('view') || '').toLowerCase();
  if (mode === 'studio' || mode === 'complet' || view === 'console' || view === 'timeline') return false;
  if (mode === 'practice' || mode === 'pratique' || mode === 'percussion') return true;
  if (p.has('tocarJunto') || p.has('train') || p.has('trainingId') || p.has('role') || p.has('targetTrack')) return true;
  return null;
}

export function resolvePracticeModeForProfile(userProfile?: UserProfile | null, isAdmin = false): boolean {
  const urlOverride = resolveDesktopUrlPracticeOverride();
  if (urlOverride !== null) return urlOverride;

  const pref = getStoredDesktopStartupMode();
  if (pref === 'practice') return true;
  if (pref === 'studio_single' || pref === 'studio_dual') return false;

  // Mode 'auto' : Studio pour Visiteur, Mestre, Éditeur ou Admin ; Pratique pour Membre / Élève
  if (!userProfile) return false;
  if (isStudioPrivilegedProfile(userProfile, isAdmin)) return false;
  return true;
}

export function resolveInitialPracticeMode(): boolean {
  if (typeof window === 'undefined') return false;
  return resolvePracticeModeForProfile(null, false);
}
