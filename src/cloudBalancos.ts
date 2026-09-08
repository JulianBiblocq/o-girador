/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  limit,
  where,
  orderBy,
  getCountFromServer
} from 'firebase/firestore';
import { BalancoPreset } from './types';

export const CLOUD_BALANCOS_COLLECTION = 'balancos';

/**
 * Sauvegarde un preset de Balanço dans Firestore.
 */
export async function saveBalancoToCloud(
  balancoData: Omit<BalancoPreset, 'id'>,
  existingDocId?: string,
  userRole?: string
): Promise<string> {
  const { ownerId, name, offsets, division, visibility, groupId, packId, authorName } = balancoData;

  if (!ownerId) throw new Error("Utilisateur non connecté");

  // Vérification quota pour les comptes gratuits (visiteur uniquement) lors d'une nouvelle création
  if (!existingDocId && (!userRole || userRole === 'visiteur')) {
    const collRef = collection(db, CLOUD_BALANCOS_COLLECTION);
    const q = query(collRef, where('ownerId', '==', ownerId));
    const snapshot = await getCountFromServer(q);
    if (snapshot.data().count >= 5) {
      throw new Error("Vous avez atteint la limite de 5 balanços gratuits");
    }
  }

  const payload = {
    name: name || "Balanço Sans Nom",
    offsets: offsets || [0, 8, -29, -58],
    division: division || 16,
    ownerId: ownerId || "",
    authorId: ownerId || "", // Règle de sécurité Firestore
    uid: ownerId || "",      // Règle de sécurité Firestore
    authorName: authorName || "",
    visibility: visibility || "private",
    groupId: groupId || null,
    packId: packId || null,
    updatedAt: Date.now()
  };

  if (existingDocId) {
    const docRef = doc(db, CLOUD_BALANCOS_COLLECTION, existingDocId);
    await updateDoc(docRef, payload);
    return existingDocId;
  } else {
    const docRef = await addDoc(collection(db, CLOUD_BALANCOS_COLLECTION), {
      ...payload,
      createdAt: Date.now()
    });
    return docRef.id;
  }
}

/**
 * Récupère tous les presets de Balanço cloud visibles par l'utilisateur courant.
 */
export async function fetchCloudBalancos(
  userUid: string | null,
  groupId?: string | null,
  userRole: string = 'visiteur',
  mestreId?: string | null
): Promise<BalancoPreset[]> {
  const balancos: BalancoPreset[] = [];
  if (!userUid) return balancos;

  const balancosRef = collection(db, CLOUD_BALANCOS_COLLECTION);

  try {
    let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;

    if (!myGroupMestreId && groupId) {
      if (groupId.toLowerCase() === 'samambaia') {
        myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      } else {
        try {
          const mestreQ = query(
            collection(db, 'users'),
            where('groupId', 'in', [groupId, groupId.toLowerCase(), 'Samambaia', 'samambaia']),
            where('role', '==', 'mestre')
          );
          const mestreSnap = await getDocs(mestreQ);
          if (!mestreSnap.empty) {
            myGroupMestreId = mestreSnap.docs[0].id;
          }
        } catch (e) {
          console.warn("Impossible de résoudre le mestre pour le groupe dans fetchCloudBalancos:", e);
        }
      }
    }

    const promises = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(balancosRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      // Requêtes parallèles ciblées sans index composite
      promises.push(getDocs(query(balancosRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(balancosRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      if (groupId) {
        promises.push(
          getDocs(
            query(
              balancosRef,
              where('groupId', 'in', [groupId, groupId.toLowerCase(), 'Samambaia', 'samambaia']),
              limit(100)
            )
          )
        );
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(balancosRef, where('ownerId', '==', myGroupMestreId), limit(100))));
      }
    }

    const snapshots = await Promise.all(promises);
    const uniqueDocs = new Map<string, any>();

    snapshots.forEach((snapshot) => {
      snapshot.forEach((docSnap) => {
        if (!uniqueDocs.has(docSnap.id)) {
          uniqueDocs.set(docSnap.id, docSnap);
        }
      });
    });

    uniqueDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const isOwner = data.ownerId === userUid;
      const isAdminGlobal = data.visibility === 'admin_global';
      const isPublic = data.visibility === 'public';
      const matchesMestre = myGroupMestreId && data.ownerId === myGroupMestreId;
      const matchesGroup =
        groupId && data.groupId && String(data.groupId).toLowerCase() === String(groupId).toLowerCase();
      const isMestreGroup = data.visibility === 'mestre_group' && (matchesMestre || matchesGroup);

      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup) {
        balancos.push({
          id: docSnap.id,
          name: data.name,
          ownerId: data.ownerId,
          authorName: data.authorName,
          groupId: data.groupId,
          visibility: data.visibility,
          packId: data.packId,
          division: data.division || 16,
          offsets: data.offsets || [0, 8, -29, -58],
          isFactory: false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    });

    // Tri par date décroissante
    balancos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {
      // Ignore silencieusement en cas d'accès non autorisé
    } else {
      console.error("Erreur lors de la récupération des balanços cloud:", err);
    }
  }

  return balancos;
}

/**
 * Supprime un preset de Balanço dans le cloud.
 */
export async function deleteCloudBalanco(balancoId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_BALANCOS_COLLECTION, balancoId));
}

/**
 * Récupère les données complètes d'un balanço par son ID.
 */
export async function getCloudBalancoData(balancoId: string): Promise<BalancoPreset | null> {
  const docSnap = await getDoc(doc(db, CLOUD_BALANCOS_COLLECTION, balancoId));
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      ownerId: data.ownerId,
      authorName: data.authorName,
      groupId: data.groupId,
      visibility: data.visibility,
      packId: data.packId,
      division: data.division || 16,
      offsets: data.offsets || [0, 8, -29, -58],
      isFactory: false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }
  return null;
}
