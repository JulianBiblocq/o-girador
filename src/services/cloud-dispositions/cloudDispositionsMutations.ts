/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { DispositionPreset } from '../../types';
import { CLOUD_DISPOSITIONS_COLLECTION } from './cloudDispositionsFetcher';

export async function saveDispositionToCloud(
  disposition: DispositionPreset,
  userRole?: string,
  canWriteSequenciador?: boolean
): Promise<string> {
  const { id, ownerId, name, authorName, visibility, groupId, instruments, hasToada } = disposition;

  if (!ownerId || ownerId === 'local') {
    throw new Error("Utilisateur non connecté");
  }

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

export async function deleteDispositionFromCloud(dispositionId: string): Promise<void> {
  if (!dispositionId || dispositionId.startsWith('local_') || dispositionId.startsWith('disp_local_')) {
    return;
  }
  await deleteDoc(doc(db, CLOUD_DISPOSITIONS_COLLECTION, dispositionId));
}
