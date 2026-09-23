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
  userRole?: string,
  canWriteSequenciador?: boolean
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

  let effectiveGroupId = groupId ? groupId.trim() : '';
  const isSamambaiaGroup =
    ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    effectiveGroupId.toLowerCase().includes('samambaia') ||
    effectiveGroupId.toLowerCase().includes('sammbia') ||
    Boolean(canWriteSequenciador);

  if (isSamambaiaGroup) {
    effectiveGroupId = 'samambaia';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }

  const defaultVis = (isSamambaiaGroup || canWriteSequenciador) ? 'mestre_group' : 'private';

  const payload = {
    name: name || "Balanço Sans Nom",
    offsets: offsets || [0, 8, -29, -58],
    division: division || 16,
    ownerId: ownerId || "",
    authorId: ownerId || "", // Règle de sécurité Firestore
    uid: ownerId || "",      // Règle de sécurité Firestore
    authorName: authorName || "",
    visibility: visibility || defaultVis,
    groupId: effectiveGroupId || null,
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
  mestreId?: string | null,
  canWriteSequenciador?: boolean
): Promise<BalancoPreset[]> {
  const balancos: BalancoPreset[] = [];
  if (!userUid) return balancos;

  const balancosRef = collection(db, CLOUD_BALANCOS_COLLECTION);

  try {
    const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;
    const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
    const isSamambaiaGroup = isJulian || 
      normalizedUserGroupId.includes('samambaia') || 
      normalizedUserGroupId.includes('sammbia') || 
      mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
      Boolean(canWriteSequenciador);

    if (isJulian || isSamambaiaGroup) {
      myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
    }

    if (!myGroupMestreId && groupId) {
      if (groupId.toLowerCase() === 'samambaia') {
        myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      } else {
        try {
          const mestreQ = query(
            collection(db, 'users'),
            where('groupId', 'in', Array.from(new Set([groupId, groupId.toLowerCase()]))),
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

    const promises: Promise<any>[] = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(balancosRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      // Requêtes parallèles ciblées sans index composite
      promises.push(getDocs(query(balancosRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(balancosRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));

      const effectiveGroup = groupId || ((isSamambaiaGroup || canWriteSequenciador) ? 'samambaia' : null);
      if (effectiveGroup) {
        const norm = effectiveGroup.trim().toLowerCase();
        const isSam = norm.includes('samambaia') || norm.includes('sammbia') || canWriteSequenciador;
        const groupIdVariants = Array.from(new Set([
          effectiveGroup, norm, ...(isSam ? ['samambaia', 'Samambaia', 'SAMAMBAIA'] : [effectiveGroup, norm])
        ]));
        promises.push(getDocs(query(balancosRef, where('groupId', 'in', groupIdVariants), limit(100))));

        // Filet de sécurité transitoire pour les balanços historiques orphelins de Bastien
        if (isSam) {
          promises.push(getDocs(query(balancosRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
        }
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
      const dataGroupIdNorm = String((data as any).groupId || '').toLowerCase().trim();
      const userGroupNorm = String(groupId || (isSamambaiaGroup || canWriteSequenciador ? 'samambaia' : '')).toLowerCase().trim();
      
      const isSamambaiaBalanco =
        dataGroupIdNorm.includes('samambaia') ||
        dataGroupIdNorm.includes('sammbia') ||
        data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
        data.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2';

      const matchesGroup = Boolean(
        (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
        ((userGroupNorm.includes('samambaia') || isSamambaiaGroup || canWriteSequenciador) && isSamambaiaBalanco)
      );
      const matchesMestre = myGroupMestreId && data.ownerId === myGroupMestreId;
      const isMemberOrEleve = userRole === 'eleve' || userRole === 'membre' || userRole === 'mestre' || userRole === 'admin';
      const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup || isSamambaiaBalanco);

      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup || matchesGroup || matchesMestre || ((isSamambaiaGroup || isMemberOrEleve) && isSamambaiaBalanco)) {
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
