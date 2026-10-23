/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Stockage hors-ligne des brouillons en répétition & synchronisation automatique (< 95 lignes).
 */

import { savePresetToCloud } from '../cloudLibrary';
import { auth } from '../firebase/config';

const OFFLINE_DRAFT_KEY = 'o_girador_offline_drafts_v1';

export interface OfflineDraftItem {
  id: string;
  name: string;
  presetData: any;
  vigilancePoints?: any[];
  signals?: any[];
  savedAt: number;
}

export function saveDraftLocally(name: string, presetData: any, vigilancePoints: any[] = [], signals: any[] = []): void {
  try {
    const raw = localStorage.getItem(OFFLINE_DRAFT_KEY);
    const drafts: OfflineDraftItem[] = raw ? JSON.parse(raw) : [];
    const item: OfflineDraftItem = {
      id: `draft_${Date.now()}`,
      name,
      presetData: { ...presetData, isDraft: true, vigilancePoints },
      vigilancePoints,
      signals,
      savedAt: Date.now(),
    };
    drafts.unshift(item);
    localStorage.setItem(OFFLINE_DRAFT_KEY, JSON.stringify(drafts.slice(0, 10)));
  } catch (err) {
    console.warn('[OfflineDraft] Impossible d’écrire dans localStorage:', err);
  }
}

export function getOfflineDrafts(): OfflineDraftItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export async function syncOfflineDraftsIfOnline(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const user = auth.currentUser;
  if (!user) return 0;

  const drafts = getOfflineDrafts();
  if (drafts.length === 0) return 0;

  let syncedCount = 0;
  const remaining: OfflineDraftItem[] = [];

  for (const draft of drafts) {
    try {
      await savePresetToCloud(
        draft.name,
        draft.presetData,
        user.uid,
        'private',
        undefined,
        null,
        undefined,
        undefined,
        undefined,
        true,
        true
      );
      syncedCount++;
    } catch (_) {
      remaining.push(draft);
    }
  }

  try {
    localStorage.setItem(OFFLINE_DRAFT_KEY, JSON.stringify(remaining));
  } catch (_) {}

  return syncedCount;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineDraftsIfOnline().catch(() => {});
  });
}
