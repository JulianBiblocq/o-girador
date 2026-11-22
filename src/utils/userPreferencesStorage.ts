import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { UserProfile } from '../contexts/auth/authTypes';

export const LEFT_HANDED_STORAGE_KEY = 'o_girador_left_handed';
export const WORKING_INSTRUMENT_STORAGE_KEY = 'sequenciador_working_instrument';
export const LAST_FOCUS_INSTRUMENT_STORAGE_KEY = 'sequenciador_last_focus_instrument';
export const DESKTOP_STARTUP_STORAGE_KEY = 'sequenciador_desktop_startup_mode';
export const MOBILE_STARTUP_STORAGE_KEY = 'sequenciador_mobile_startup_mode';
export const PREFERRED_SCREEN_MODE_STORAGE_KEY = 'sequenciador_preferred_screen_mode';

export type WorkingInstrumentChoice =
  | 'auto' | 'marcante' | 'meiao' | 'repique' | 'caixa'
  | 'tarol' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';
export type DesktopStartupMode = 'auto' | 'practice' | 'studio_single' | 'studio_dual';
export type MobileStartupMode = 'last' | 'percussion' | 'danse' | 'editeur' | 'complet';

export const WORKING_INSTRUMENT_OPTIONS: Array<{ id: Exclude<WorkingInstrumentChoice, 'auto'>; labelFr: string; labelPt: string }> = [
  { id: 'marcante', labelFr: 'Alfaia Marcante', labelPt: 'Alfaia Marcante' },
  { id: 'meiao', labelFr: 'Alfaia Meião', labelPt: 'Alfaia Meião' },
  { id: 'repique', labelFr: 'Alfaia Repique', labelPt: 'Alfaia Repique' },
  { id: 'caixa', labelFr: 'Caixa de Guerra', labelPt: 'Caixa de Guerra' },
  { id: 'tarol', labelFr: 'Tarol', labelPt: 'Tarol' },
  { id: 'gongue', labelFr: 'Gonguê', labelPt: 'Gonguê' },
  { id: 'timbal', labelFr: 'Timbal', labelPt: 'Timbal' },
  { id: 'agbe', labelFr: 'Agbê (Xequerê)', labelPt: 'Agbê (Xequerê)' },
  { id: 'mineiro', labelFr: 'Mineiro (Ganzá)', labelPt: 'Mineiro (Ganzá)' },
];

const VALID_INSTRUMENTS = new Set<string>(['auto', ...WORKING_INSTRUMENT_OPTIONS.map((o) => o.id)]);
const VALID_DESKTOP_MODES = new Set<string>(['auto', 'practice', 'studio_single', 'studio_dual']);
const VALID_MOBILE_MODES = new Set<string>(['last', 'percussion', 'danse', 'editeur', 'complet']);

export function getStoredLeftHanded(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(LEFT_HANDED_STORAGE_KEY) === 'true'; } catch { return false; }
}
export function setStoredLeftHanded(val: boolean): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LEFT_HANDED_STORAGE_KEY, String(val)); } catch {}
}
export function hasExplicitLocalWorkingInstrument(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(WORKING_INSTRUMENT_STORAGE_KEY) !== null; } catch { return false; }
}
export function getStoredWorkingInstrument(): WorkingInstrumentChoice {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = (localStorage.getItem(WORKING_INSTRUMENT_STORAGE_KEY) || '').trim().toLowerCase();
    return VALID_INSTRUMENTS.has(raw) ? (raw as WorkingInstrumentChoice) : 'auto';
  } catch { return 'auto'; }
}
export function setStoredWorkingInstrument(choice: WorkingInstrumentChoice): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(WORKING_INSTRUMENT_STORAGE_KEY, choice); } catch {}
}
export function getStoredLastFocusInstrument(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = (localStorage.getItem(LAST_FOCUS_INSTRUMENT_STORAGE_KEY) || '').trim().toLowerCase();
    return raw && raw !== 'auto' ? raw : null;
  } catch { return null; }
}
export function setStoredLastFocusInstrument(instrumentId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (instrumentId && instrumentId !== 'auto') localStorage.setItem(LAST_FOCUS_INSTRUMENT_STORAGE_KEY, instrumentId.trim().toLowerCase());
    else localStorage.removeItem(LAST_FOCUS_INSTRUMENT_STORAGE_KEY);
  } catch {}
}
export function getEffectiveWorkingInstrument(profile?: UserProfile | null): string | null {
  const orgInst = (profile?.instrument || '').trim();
  if (orgInst) return orgInst;
  const cloudPref = (profile?.preferredInstrument || '').trim();
  if (cloudPref && cloudPref !== 'auto') return cloudPref;
  const local = getStoredWorkingInstrument();
  return local !== 'auto' ? local : null;
}
export function formatWorkingInstrumentLabel(profile: UserProfile | null | undefined, lang: 'fr' | 'pt'): string {
  const local = getStoredWorkingInstrument();
  const effectiveKey = local !== 'auto' ? local : (profile?.instrument || profile?.preferredInstrument || '').trim().toLowerCase();
  const found = WORKING_INSTRUMENT_OPTIONS.find((o) => o.id === effectiveKey);
  if (found) return lang === 'pt' ? found.labelPt : found.labelFr;
  return profile?.instrument || 'Auto (Marcante)';
}
export function getStoredDesktopStartupMode(): DesktopStartupMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = localStorage.getItem(DESKTOP_STARTUP_STORAGE_KEY) || 'auto';
    return VALID_DESKTOP_MODES.has(raw) ? (raw as DesktopStartupMode) : 'auto';
  } catch { return 'auto'; }
}
export function setStoredDesktopStartupMode(mode: DesktopStartupMode): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(DESKTOP_STARTUP_STORAGE_KEY, mode); } catch {}
}
export function getStoredMobileStartupMode(): MobileStartupMode {
  if (typeof window === 'undefined') return 'last';
  try {
    const raw = (localStorage.getItem(MOBILE_STARTUP_STORAGE_KEY) || 'last').trim().toLowerCase();
    if (raw === 'lecture' || raw === 'escuta') return 'danse';
    return VALID_MOBILE_MODES.has(raw) ? (raw as MobileStartupMode) : 'last';
  } catch { return 'last'; }
}
export function setStoredMobileStartupMode(mode: MobileStartupMode): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(MOBILE_STARTUP_STORAGE_KEY, mode); } catch {}
}
export function isSuperAdminProfile(userProfile?: UserProfile | null): boolean {
  if (!userProfile) return false;
  const rawRole = String(userProfile.dbRole || userProfile.role || '').toLowerCase();
  return (
    userProfile.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' || userProfile.isSystemAdmin === true ||
    (userProfile.role as string) === 'admin' || (userProfile.role as string) === 'super-admin' ||
    rawRole === 'admin' || rawRole === 'super-admin'
  );
}
export function formatUserRoleLabel(userProfile: UserProfile | null | undefined, lang: 'fr' | 'pt'): string {
  const isPt = lang === 'pt';
  if (!userProfile) return isPt ? 'Visitante' : 'Visiteur';
  if (isSuperAdminProfile(userProfile)) return 'Admin';
  const r = String(userProfile.dbRole || userProfile.role || '').toLowerCase();
  if (r === 'mestre' || r === 'mestri') return 'Mestre';
  if (r === 'membre') return isPt ? 'Membro' : 'Membre';
  if (r === 'eleve') return isPt ? 'Aluno' : 'Élève';
  return isPt ? 'Visitante' : 'Visiteur';
}
export async function syncAccountPreferenceSilently(uid: string | null | undefined, patch: Record<string, unknown>): Promise<void> {
  if (!uid) return;
  try { await setDoc(doc(db, 'users', uid), patch, { merge: true }); } catch {}
}
