/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { BalancoPreset } from '../../types';
import { CLOUD_BALANCOS_COLLECTION } from './cloudBalancosFetcher';

export async function saveBalancoToCloud(
  balancoData: Omit<BalancoPreset, 'id'>,
  existingDocId?: string,
  userRole?: string,
  canWriteSequenciador?: boolean
): Promise<string> {
  const { ownerId, name, offsets, division, visibility, groupId, packId, authorName } = balancoData;
  if (!ownerId) throw new Error("Utilisateur non connecté");

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
    authorId: ownerId || "",
    uid: ownerId || "",
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

export async function deleteCloudBalanco(balancoId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_BALANCOS_COLLECTION, balancoId));
}

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
