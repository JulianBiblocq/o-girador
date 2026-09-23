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
  query,
  limit,
  where,
  orderBy,
  getCountFromServer
} from 'firebase/firestore';
import { DispositionPreset } from './types';

export const CLOUD_DISPOSITIONS_COLLECTION = 'dispositions';

/**
 * Sauvegarde un preset de disposition spatiale dans Firestore.
 */
export async function saveDispositionToCloud(
  disposition: DispositionPreset,
  userRole?: string,
  canWriteSequenciador?: boolean
): Promise<string> {
  const { id, ownerId, name, authorName, visibility, groupId, instruments, hasToada } = disposition;

  if (!ownerId || ownerId === 'local') {
    throw new Error("Utilisateur non connecté");
  }

  // Quota pour les visiteurs gratuits : maximum 5 dispositions
  if ((!id || id.startsWith('local_') || id.startsWith('disp_local_')) && (!userRole || userRole === 'visiteur')) {
    try {
      const collRef = collection(db, CLOUD_DISPOSITIONS_COLLECTION);
      const q = query(collRef, where('ownerId', '==', ownerId));
      const snapshot = await getCountFromServer(q);
      if (snapshot.data().count >= 5) {
        throw new Error("Vous avez atteint la limite de 5 dispositions gratuites");
      }
    } catch (e: any) {
      if (e?.message?.includes("limite")) throw e;
      // En cas de restriction d'agrégation, on continue
    }
  }

  let effectiveGroupId = groupId ? groupId.trim() : '';
  const isSamambaiaGroup =
    ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2' ||
    effectiveGroupId.toLowerCase().includes('samambaia') ||
    effectiveGroupId.toLowerCase().includes('sammbia') ||
    Boolean(canWriteSequenciador);

  if (isSamambaiaGroup) {
    // Normalisation canonique pour Samambaia
    effectiveGroupId = 'samambaia';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }

  const defaultVis = (isSamambaiaGroup || canWriteSequenciador) ? 'mestre_group' : 'private';

  const payload = {
    name: name?.trim() || "Disposition Sans Nom",
    ownerId: ownerId,
    authorId: disposition.authorId || ownerId,
    uid: ownerId,
    authorName: authorName || "",
    visibility: visibility || defaultVis,
    groupId: effectiveGroupId || null,
    mestreId: isSamambaiaGroup ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : (disposition.mestreId || null),
    instruments: (instruments || []).map((inst) => ({
      instrumentType: inst.instrumentType,
      x: Number(inst.x),
      y: Number(inst.y)
    })),
    hasToada: Boolean(hasToada),
    updatedAt: Date.now()
  };

  const isExistingCloudDoc = id && !id.startsWith('local_') && !id.startsWith('disp_local_');

  if (isExistingCloudDoc) {
    const docRef = doc(db, CLOUD_DISPOSITIONS_COLLECTION, id);
    await updateDoc(docRef, payload);
    return id;
  } else {
    const docRef = await addDoc(collection(db, CLOUD_DISPOSITIONS_COLLECTION), {
      ...payload,
      createdAt: disposition.createdAt || Date.now()
    });
    return docRef.id;
  }
}

/**
 * Supprime un preset de disposition dans Firestore.
 */
export async function deleteDispositionFromCloud(dispositionId: string): Promise<void> {
  if (!dispositionId || dispositionId.startsWith('local_') || dispositionId.startsWith('disp_local_')) {
    return;
  }
  await deleteDoc(doc(db, CLOUD_DISPOSITIONS_COLLECTION, dispositionId));
}

/**
 * Récupère tous les presets de disposition cloud visibles par l'utilisateur courant.
 */
export async function fetchCloudDispositions(
  userUid: string | null,
  groupId?: string | null,
  mestreId?: string | null,
  userRole: string = 'visiteur',
  canWriteSequenciador?: boolean
): Promise<DispositionPreset[]> {
  const dispositions: DispositionPreset[] = [];
  if (!userUid || userUid === 'local') return dispositions;

  const dispositionsRef = collection(db, CLOUD_DISPOSITIONS_COLLECTION);

  try {
    const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;
    const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
    const isSamambaiaGroup = isJulian || 
      userUid === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2' ||
      normalizedUserGroupId.includes('samambaia') || 
      normalizedUserGroupId.includes('sammbia') || 
      Boolean(canWriteSequenciador);

    if (isSamambaiaGroup && !myGroupMestreId) {
      myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    } else if (!myGroupMestreId && normalizedUserGroupId) {
      try {
        const mestreQ = query(
          collection(db, 'users'),
          where('groupId', 'in', Array.from(new Set([groupId?.trim() || '', normalizedUserGroupId]))),
          where('role', '==', 'mestre')
        );
        const mestreSnap = await getDocs(mestreQ);
        if (!mestreSnap.empty) {
          myGroupMestreId = mestreSnap.docs[0].id;
        }
      } catch (e) {
        console.warn("Impossible de résoudre le mestre pour le groupe dans fetchCloudDispositions:", e);
      }
    }

    const groupIdVariants = isSamambaiaGroup 
      ? ['samambaia', 'Samambaia']
      : (groupId && groupId.trim() !== '' ? Array.from(new Set([groupId.trim(), groupId.trim().toLowerCase()])) : []);

    const promises: Promise<any>[] = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(dispositionsRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      // 1. Presets personnels
      promises.push(getDocs(query(dispositionsRef, where('ownerId', '==', userUid), limit(100))));
      // 2. Presets globaux / publics
      promises.push(getDocs(query(dispositionsRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      // 3. Presets de groupe (uniquement si groupIdVariants non vide)
      if (groupIdVariants.length > 0) {
        promises.push(
          getDocs(
            query(
              dispositionsRef,
              where('groupId', 'in', groupIdVariants),
              limit(100)
            )
          )
        );
      }

      // 4. Presets créés par le Mestre du groupe
      if (myGroupMestreId && myGroupMestreId !== userUid) {
        promises.push(getDocs(query(dispositionsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
      }

      // 5. Filet de sécurité transitoire pour les anciens presets de Bastien
      if (isSamambaiaGroup && userUid !== 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2' && myGroupMestreId !== 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2') {
        promises.push(getDocs(query(dispositionsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
      }
    }

    const snapshots = await Promise.all(promises);
    const uniqueDocs = new Map<string, any>();

    snapshots.forEach((snapshot) => {
      snapshot.forEach((docSnap: any) => {
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
      const docGroupId = (data.groupId || '').toString().toLowerCase();
      const matchesGroup =
        Boolean(normalizedUserGroupId && docGroupId && docGroupId === normalizedUserGroupId);
      const isSamambaiaDisp = isSamambaiaGroup && (
        docGroupId.includes('samambaia') ||
        data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'
      );
      const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup || isSamambaiaDisp);

      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup || matchesGroup || matchesMestre || isSamambaiaDisp) {
        dispositions.push({
          id: docSnap.id,
          name: data.name || "Disposition",
          ownerId: data.ownerId,
          authorId: data.authorId || data.ownerId,
          authorName: data.authorName,
          groupId: data.groupId,
          mestreId: data.mestreId,
          visibility: data.visibility || 'private',
          instruments: Array.isArray(data.instruments) ? data.instruments : [],
          hasToada: Boolean(data.hasToada),
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now()
        });
      }
    });

    // Tri par date décroissante
    dispositions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {
      // Ignore silencieusement en cas d'accès non autorisé
    } else {
      console.warn("Erreur lors de la récupération des dispositions cloud:", err);
    }
  }

  return dispositions;
}
