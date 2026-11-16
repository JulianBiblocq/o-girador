import { auth } from '../firebase/config';
import type { UserProfile } from '../contexts/auth/authTypes';
import { getStoredMobileStartupMode, syncAccountPreferenceSilently } from './userPreferencesStorage';

export type MobileViewMode = 'danse' | 'percussion' | 'editeur' | 'complet';

export const MOBILE_VIEW_MODE_STORAGE_KEY = 'sequenciador_last_view_mode';

export function isStudioPrivilegedProfile(profile?: any, isAdmin = false): boolean {
  if (isAdmin) return true;
  if (!profile) return false;
  const role = String(profile.role || profile.dbRole || '').toLowerCase();
  return role === 'mestre' || role === 'mestri' || role === 'admin' || role === 'super-admin' || Boolean(profile.canWriteSequenciador) || Boolean(profile.isSystemAdmin);
}

export function hasDirectModeUrlParam(): boolean {
  if (typeof window === 'undefined') return false;
  const p = new URLSearchParams(window.location.search);
  return (
    p.has('mode') || p.has('view') || p.has('tocarJunto') || p.has('train') ||
    p.has('trainingId') || p.has('role') || p.has('targetTrack')
  );
}

export function persistMobileViewModeLocally(mode: MobileViewMode): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(MOBILE_VIEW_MODE_STORAGE_KEY, mode); } catch {}
}

export function persistMobileViewMode(mode: MobileViewMode): void {
  persistMobileViewModeLocally(mode);
  const uid = auth.currentUser?.uid;
  if (uid) void syncAccountPreferenceSilently(uid, { lastSequenciadorMode: mode });
}

export function getInitialMobileViewMode(): MobileViewMode {
  if (typeof window === 'undefined') return 'complet';
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = (urlParams.get('mode') || '').toLowerCase();
  const viewParam = (urlParams.get('view') || '').toLowerCase();

  // Priorité n°1 absolue : paramètres d'URL explicites
  if (modeParam === 'danse' || viewParam === 'danse') { persistMobileViewModeLocally('danse'); return 'danse'; }
  if (
    modeParam === 'percussion' || urlParams.has('tocarJunto') || urlParams.has('train') ||
    urlParams.has('trainingId') || urlParams.has('role') || urlParams.has('targetTrack')
  ) {
    persistMobileViewModeLocally('percussion'); return 'percussion';
  }
  if (modeParam === 'editeur' || modeParam === 'edition') { persistMobileViewModeLocally('editeur'); return 'editeur'; }
  if (modeParam === 'complet' || modeParam === 'studio') { persistMobileViewModeLocally('complet'); return 'complet'; }

  // Priorité n°2 : préférence locale d'ouverture Smartphone sur cet appareil
  const startupPref = getStoredMobileStartupMode();
  if (startupPref !== 'last') return startupPref;

  try {
    const saved = localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY);
    if (saved === 'danse' || saved === 'percussion' || saved === 'editeur' || saved === 'complet') return saved;
  } catch {}
  return 'complet';
}

export function resolveDefaultModeFromProfile(profile: UserProfile): MobileViewMode {
  if (isStudioPrivilegedProfile(profile)) return 'complet';
  const role = (profile.dbRole || profile.role || '').toLowerCase();
  const inst = (profile.instrument || '').toLowerCase();
  const isDanseur = role.includes('danse') || inst.includes('danse') || Boolean(profile.canWriteDansador) || Boolean(profile.hasDancaAccess);
  if (isDanseur) return 'danse';
  const isPercussion = role.includes('percu') || role === 'eleve' || role === 'membre' || (Boolean(inst) && !inst.includes('danse'));
  if (isPercussion) return 'percussion';
  return 'complet';
}

export function syncMobileViewModeWithProfile(
  profile: UserProfile | null | undefined,
  currentStoreMode?: MobileViewMode,
  setMobileViewMode?: (mode: MobileViewMode) => void
): void {
  if (!profile || typeof window === 'undefined') return;
  if (hasDirectModeUrlParam()) return;

  const startupPref = getStoredMobileStartupMode();
  if (startupPref !== 'last') {
    if (startupPref === 'editeur' && !isStudioPrivilegedProfile(profile) && window.location.hostname !== 'localhost') {
      return;
    }
    if (setMobileViewMode && currentStoreMode !== startupPref) setMobileViewMode(startupPref);
    return;
  }

  const savedLocal = localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY);
  if (savedLocal && ['danse', 'percussion', 'editeur', 'complet'].includes(savedLocal)) return;

  if (isStudioPrivilegedProfile(profile)) {
    if (setMobileViewMode && currentStoreMode !== 'complet') setMobileViewMode('complet');
    persistMobileViewModeLocally('complet');
    return;
  }

  if (profile.lastSequenciadorMode && ['danse', 'percussion', 'editeur', 'complet'].includes(profile.lastSequenciadorMode)) {
    const cloudMode = profile.lastSequenciadorMode as MobileViewMode;
    if (setMobileViewMode && currentStoreMode !== cloudMode) setMobileViewMode(cloudMode);
    persistMobileViewModeLocally(cloudMode);
    return;
  }

  if (!savedLocal && setMobileViewMode) setMobileViewMode(resolveDefaultModeFromProfile(profile));
}
