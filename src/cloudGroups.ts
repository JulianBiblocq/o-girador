import { db } from './firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getGroupIdVariants, getDefaultGroupPresetId } from './services/cloud-groups/cloudGroupVariants';

export { getGroupIdVariants, getDefaultGroupPresetId };

export interface GroupDoc {
  defaultPresetId?: string | null;
  updatedAt?: number;
  [key: string]: any;
}

/**
 * Écoute en temps réel les changements du document de groupe pour maintenir le morceau vedette synchronisé.
 * Écoute les variantes de 'associations' et 'groups'.
 */
export function subscribeToGroupDefaultPreset(
  groupId: string | null | undefined,
  callback: (defaultPresetId: string | null) => void
): () => void {
  if (!groupId) {
    callback(null);
    return () => {};
  }
  const variants = getGroupIdVariants(groupId);

  const unsubs: (() => void)[] = [];
  let isCleanedUp = false;

  const handleSnap = (snap: any) => {
    if (isCleanedUp) return;
    if (snap && snap.exists() && snap.data()?.defaultPresetId !== undefined) {
      callback(snap.data()?.defaultPresetId || null);
    }
  };

  variants.forEach((id) => {
    try {
      const unsubAssoc = onSnapshot(doc(db, 'associations', id), handleSnap, () => {});
      unsubs.push(unsubAssoc);
    } catch (_) {}

    try {
      const unsubGroup = onSnapshot(doc(db, 'groups', id), handleSnap, () => {});
      unsubs.push(unsubGroup);
    } catch (_) {}
  });

  return () => {
    isCleanedUp = true;
    unsubs.forEach((unsub) => {
      try { unsub(); } catch (_) {}
    });
  };
}

/**
 * Définit ou retire le morceau vedette du groupe.
 * Réservé aux utilisateurs ayant le rôle 'mestre' ou 'admin'.
 * Double écriture transparente sur associations/<variant> et groups/<variant>.
 */
export async function setDefaultGroupPreset(
  groupId: string,
  presetId: string | null,
  userRole?: string
): Promise<void> {
  if (!groupId) {
    throw new Error('GroupId manquant');
  }

  const variants = getGroupIdVariants(groupId);
  const isAllowed = userRole === 'mestre' || userRole === 'admin';
  if (!isAllowed) {
    throw new Error("Action réservée aux Mestres et Administrateurs du groupe.");
  }

  const cleanPresetId = presetId && presetId.trim().length > 0 ? presetId.trim() : null;

  const payload = {
    defaultPresetId: cleanPresetId,
    updatedAt: Date.now(),
  };

  // Double écriture miroir transparente sur toutes les variantes
  const writes: Promise<any>[] = [];

  for (const id of variants) {
    // 1. associations (collection canonique ouverte)
    writes.push(
      setDoc(doc(db, 'associations', id), payload, { merge: true }).catch((err) => {
        console.warn(`[cloudGroups] Failed setDoc associations/${id}:`, err);
      })
    );
    // 2. groups (collection miroir)
    writes.push(
      setDoc(doc(db, 'groups', id), payload, { merge: true }).catch((err) => {
        console.warn(`[cloudGroups] Failed setDoc groups/${id}:`, err);
      })
    );
  }

  await Promise.all(writes);
}
