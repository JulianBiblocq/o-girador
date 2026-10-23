/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
