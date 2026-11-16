/**
 * Helpers de résolution des identifiants et presets par défaut de groupes (< 50 lignes).
 */

import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export function getGroupIdVariants(groupId: string): string[] {
  if (!groupId) return [];
  const raw = groupId.trim();
  const lower = raw.toLowerCase();
  return raw !== lower ? [lower, raw] : [lower];
}

export async function getDefaultGroupPresetId(groupId: string): Promise<string | null> {
  if (!groupId) return null;
  const variants = getGroupIdVariants(groupId);

  for (const id of variants) {
    try {
      const snap = await getDoc(doc(db, 'associations', id));
      if (snap.exists() && snap.data()?.defaultPresetId !== undefined && snap.data()?.defaultPresetId !== null) {
        return snap.data().defaultPresetId;
      }
    } catch (_) {}
  }

  for (const id of variants) {
    try {
      const snap = await getDoc(doc(db, 'groups', id));
      if (snap.exists() && snap.data()?.defaultPresetId !== undefined && snap.data()?.defaultPresetId !== null) {
        return snap.data().defaultPresetId;
      }
    } catch (_) {}
  }

  return null;
}

export async function resolveGroupLogoFromCloud(groupId?: string | null): Promise<string | null> {
  if (!groupId) return null;
  const variants = getGroupIdVariants(groupId);
  for (const col of ['associations', 'groups'] as const) {
    for (const id of variants) {
      try {
        const snap = await getDoc(doc(db, col, id));
        if (!snap.exists()) continue;
        const d = snap.data();
        const candidate = d?.logoUrl || d?.logo || d?.groupLogoUrl || d?.branding?.logoUrl || d?.iconUrl;
        if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
      } catch (_) {}
    }
  }
  return null;
}
