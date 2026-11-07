/**
 * lutheriePresetsStorage.ts — 4 Accords Prédéfinis d'Usine & Sauvegarde Personnelle
 * Local-First (`localStorage` + synchronisation Cloud Firestore sur `users/{uid}`) (< 125 lignes).
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const LUTHERIE_DRUM_ROLES = ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'] as const;
export type LutherieDrumRole = (typeof LUTHERIE_DRUM_ROLES)[number];

export interface LutheriePreset {
  id: string;
  nameFr: string;
  namePt: string;
  subtitle?: string;
  isFactory?: boolean;
  tunings: Record<LutherieDrumRole, number>;
  decays: Record<LutherieDrumRole, number>;
}

export const LUTHERIE_STORAGE_KEY = 'ogirador_custom_lutherie_presets_v1';

export const FACTORY_LUTHERIE_PRESETS: LutheriePreset[] = [
  {
    id: 'trad_minor', nameFr: 'Traditionnel', namePt: 'Tradicional', subtitle: 'Si1 • Ré2 • Fa#2', isFactory: true,
    tunings: { marcante: 0, meiao: 0, repique: 0, caixa: 0, tarol: 0, timbal: 0 },
    decays: { marcante: 95, meiao: 95, repique: 100, caixa: 95, tarol: 95, timbal: 100 },
  },
  {
    id: 'fifth_drone', nameFr: 'Quinte & Octave', namePt: 'Quinta & Oitava', subtitle: 'La1 • Mi2 • La2', isFactory: true,
    tunings: { marcante: -2, meiao: 2, repique: 3, caixa: -1, tarol: 0, timbal: -2 },
    decays: { marcante: 85, meiao: 90, repique: 100, caixa: 90, tarol: 95, timbal: 95 },
  },
  {
    id: 'major_open', nameFr: 'Trio Majeur', namePt: 'Trio Maior', subtitle: 'Do2 • Mi2 • Sol2', isFactory: true,
    tunings: { marcante: 1, meiao: 2, repique: 1, caixa: 1, tarol: 1, timbal: 1 },
    decays: { marcante: 90, meiao: 95, repique: 100, caixa: 95, tarol: 95, timbal: 100 },
  },
  {
    id: 'fast_tight', nameFr: 'Baque Sec & Rapide', namePt: 'Baque Seco & Rápido', subtitle: 'Peaux mates', isFactory: true,
    tunings: { marcante: 0, meiao: 2, repique: 2, caixa: 1.5, tarol: 2, timbal: 1 },
    decays: { marcante: 68, meiao: 74, repique: 82, caixa: 75, tarol: 75, timbal: 80 },
  },
];

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
  decays: Record<LutherieDrumRole, number>
): LutheriePreset[] {
  const cleanName = name.trim();
  if (!cleanName) return loadCustomLutheriePresets();
  const current = loadCustomLutheriePresets();
  const norm = cleanName.toLowerCase();
  const existingIdx = current.findIndex((p) => p.nameFr.trim().toLowerCase() === norm || p.namePt.trim().toLowerCase() === norm);
  const entry: LutheriePreset = {
    id: existingIdx >= 0 ? current[existingIdx].id : `custom_luth_${Date.now()}`,
    nameFr: cleanName, namePt: cleanName, isFactory: false, tunings: { ...tunings }, decays: { ...decays },
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
  preset: LutheriePreset, tunings: Record<LutherieDrumRole, number>, decays: Record<LutherieDrumRole, number>
): boolean {
  return LUTHERIE_DRUM_ROLES.every(
    (r) => Math.abs((preset.tunings[r] ?? 0) - (tunings[r] ?? 0)) < 0.05 && Math.round(preset.decays[r] ?? 100) === Math.round(decays[r] ?? 100)
  );
}
