/**
 * lutheriePresetsStorage.ts — Presets d'Usine Dynamiques & Sauvegarde Personnelle
 * Local-First (`localStorage` + synchronisation Cloud Firestore sur `users/{uid}`) (< 115 lignes).
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  buildFactoryLutheriePresets,
  DEFAULT_SIGNATURE_TUNINGS,
  getDefaultSignatureTuning,
  LUTHERIE_DRUM_ROLES,
  LutherieDrumRole,
  LutheriePreset,
} from './lutherieFactoryPresets';

export { LUTHERIE_DRUM_ROLES, DEFAULT_SIGNATURE_TUNINGS, getDefaultSignatureTuning, buildFactoryLutheriePresets };
export type { LutherieDrumRole, LutheriePreset };

export const LUTHERIE_STORAGE_KEY = 'ogirador_custom_lutherie_presets_v1';

export const FACTORY_LUTHERIE_PRESETS: LutheriePreset[] = buildFactoryLutheriePresets();

function writeLocalPresets(presets: LutheriePreset[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LUTHERIE_STORAGE_KEY, JSON.stringify(presets));
  } catch (_) {}
}

function syncPresetsToCloudInBackground(updatedPresets: LutheriePreset[]): void {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
  import('../../firebase/config')
    .then(({ auth, db }) => {
      const uid = auth.currentUser?.uid;
      if (uid) setDoc(doc(db, 'users', uid), { customLutheriePresets: updatedPresets, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    })
    .catch(() => {});
}

export function loadCustomLutheriePresets(): LutheriePreset[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LUTHERIE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.id === 'string' && p.tunings && p.decays) : [];
  } catch (_) {
    return [];
  }
}

export function saveCustomLutheriePreset(
  name: string,
  tunings: Record<LutherieDrumRole, number>,
  decays: Record<LutherieDrumRole, number>,
  skinChorusAmount = 0.75,
  rodaBreathingAmount = 0.75
): LutheriePreset[] {
  const cleanName = name.trim();
  if (!cleanName) return loadCustomLutheriePresets();
  const current = loadCustomLutheriePresets();
  const norm = cleanName.toLowerCase();
  const existingIdx = current.findIndex((p) => p.nameFr.trim().toLowerCase() === norm || p.namePt.trim().toLowerCase() === norm);
  const entry: LutheriePreset = {
    id: existingIdx >= 0 ? current[existingIdx].id : `custom_luth_${Date.now()}`,
    nameFr: cleanName, namePt: cleanName, isFactory: false, tunings: { ...tunings }, decays: { ...decays },
    skinChorusAmount, rodaBreathingAmount,
  };
  const updated = existingIdx >= 0 ? current.map((p, idx) => (idx === existingIdx ? entry : p)) : [...current, entry];
  writeLocalPresets(updated);
  syncPresetsToCloudInBackground(updated);
  return updated;
}

export function deleteCustomLutheriePreset(id: string): LutheriePreset[] {
  const updated = loadCustomLutheriePresets().filter((p) => p.id !== id);
  writeLocalPresets(updated);
  syncPresetsToCloudInBackground(updated);
  return updated;
}

export async function syncCustomLutheriePresetsFromCloud(): Promise<LutheriePreset[]> {
  const local = loadCustomLutheriePresets();
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return local;
  try {
    const { auth, db } = await import('../../firebase/config');
    const uid = auth.currentUser?.uid;
    if (!uid) return local;
    const snap = await getDoc(doc(db, 'users', uid));
    const cloudList: LutheriePreset[] = snap.exists() && Array.isArray(snap.data()?.customLutheriePresets) ? snap.data().customLutheriePresets : [];
    if (cloudList.length === 0) return local;
    const merged = [...local];
    for (const c of cloudList) {
      if (!c?.id || !c.tunings || !c.decays) continue;
      if (!merged.some((m) => m.id === c.id || m.nameFr.trim().toLowerCase() === (c.nameFr || '').trim().toLowerCase())) merged.push(c);
    }
    writeLocalPresets(merged);
    return merged;
  } catch (_) {
    return local;
  }
}

export function isLutheriePresetMatching(
  preset: LutheriePreset,
  tunings: Record<LutherieDrumRole, number>,
  decays: Record<LutherieDrumRole, number>
): boolean {
  return LUTHERIE_DRUM_ROLES.every(
    (r) =>
      Math.abs((preset.tunings[r] ?? 0) - (tunings[r] ?? 0)) <= 0.05 &&
      Math.round(preset.decays[r] ?? 100) === Math.round(decays[r] ?? 100)
  );
}
