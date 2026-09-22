import { db } from './firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface GroupDoc {
  defaultPresetId?: string | null;
  updatedAt?: number;
  [key: string]: any;
}

/**
 * Récupère l'ID du preset par défaut (morceau vedette) pour un groupe donné depuis Firestore.
 * Vérifie dans 'associations' (collection canonique autorisée) puis dans 'groups'.
 */
export async function getDefaultGroupPresetId(groupId: string): Promise<string | null> {
  if (!groupId) return null;
  const cleanGroupId = groupId.trim().toLowerCase();

  // 1. Priorité à la collection 'associations' (règles de sécurité ouvertes en lecture)
  try {
    const assocSnap = await getDoc(doc(db, 'associations', cleanGroupId));
    if (assocSnap.exists() && assocSnap.data()?.defaultPresetId !== undefined) {
      return assocSnap.data().defaultPresetId || null;
    }
  } catch (_) {}

  // 2. Vérification dans 'groups'
  try {
    const groupSnap = await getDoc(doc(db, 'groups', cleanGroupId));
    if (groupSnap.exists() && groupSnap.data()?.defaultPresetId !== undefined) {
      return groupSnap.data().defaultPresetId || null;
    }
  } catch (_) {}

  return null;
}

/**
 * Écoute en temps réel les changements du document de groupe pour maintenir le morceau vedette synchronisé.
 */
export function subscribeToGroupDefaultPreset(
  groupId: string | null | undefined,
  callback: (defaultPresetId: string | null) => void
): () => void {
  if (!groupId) {
    callback(null);
    return () => {};
  }
  const cleanGroupId = groupId.trim().toLowerCase();
  const assocRef = doc(db, 'associations', cleanGroupId);

  // Écoute temps-réel de 'associations'
  return onSnapshot(
    assocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.defaultPresetId !== undefined) {
        callback(snap.data()?.defaultPresetId || null);
      } else {
        // Fallback sur 'groups'
        getDoc(doc(db, 'groups', cleanGroupId)).then((gSnap) => {
          if (gSnap.exists()) {
            callback(gSnap.data()?.defaultPresetId || null);
          } else {
            callback(null);
          }
        }).catch(() => callback(null));
      }
    },
    () => {
      // En cas d'erreur sur associations, écouter groups
      onSnapshot(doc(db, 'groups', cleanGroupId), (snap) => {
        callback(snap.exists() ? (snap.data()?.defaultPresetId || null) : null);
      }, () => callback(null));
    }
  );
}

/**
 * Définit ou retire le morceau vedette du groupe (icône Cactus 🌵).
 * Réservé aux utilisateurs ayant le rôle 'mestre' ou 'admin'.
 * Lors du désépinglage, passe strictement la valeur `null` à Firestore.
 */
export async function setDefaultGroupPreset(
  groupId: string,
  presetId: string | null,
  userRole?: string
): Promise<void> {
  if (!groupId) {
    throw new Error('GroupId manquant');
  }

  const cleanGroupId = groupId.trim().toLowerCase();
  const isAllowed = userRole === 'mestre' || userRole === 'admin';
  if (!isAllowed) {
    throw new Error("Action réservée aux Mestres et Administrateurs du groupe.");
  }

  const cleanPresetId = presetId && presetId.trim().length > 0 ? presetId.trim() : null;

  const payload = {
    defaultPresetId: cleanPresetId,
    updatedAt: Date.now(),
  };

  // 1. Écriture principale dans associations (autorisée par les règles Firestore pour Mestre/Admin)
  await setDoc(doc(db, 'associations', cleanGroupId), payload, { merge: true });

  // 2. Écriture miroir dans groups si autorisée
  try {
    await setDoc(doc(db, 'groups', cleanGroupId), payload, { merge: true });
  } catch (_) {
    // Si la collection groups n'est pas encore créée dans les règles, associations assure la persistance
  }
}
