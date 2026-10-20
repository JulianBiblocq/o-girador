/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { CloudPattern, CatalogVisibility, SavedPattern } from '../../types';
import LZString from 'lz-string';
import { CLOUD_PATTERNS_COLLECTION } from './cloudPatternsFetcher';

export async function savePatternToCloud(
  pattern: SavedPattern,
  ownerId: string,
  visibility: CatalogVisibility,
  mestreId?: string,
  existingDocId?: string,
  userRole?: string,
  groupId?: string,
  canWriteSequenciador?: boolean
): Promise<string> {
  if (!ownerId) throw new Error("Utilisateur non connecté");

  if (!existingDocId && (!userRole || userRole === 'visiteur')) {
    const collRef = collection(db, CLOUD_PATTERNS_COLLECTION);
    const q = query(collRef, where('ownerId', '==', ownerId));
    const snapshot = await getCountFromServer(q);
    if (snapshot.data().count >= 2) {
      throw new Error("Vous avez atteint la limite de 2 patterns gratuits");
    }
  }

  const dataString = LZString.compressToBase64(JSON.stringify(pattern));
  let effectiveGroupId = groupId ? groupId.trim() : '';
  let effectiveMestreId = (userRole === 'mestre' || userRole === 'mestri') ? ownerId : (mestreId || null);

  const isSamambaiaGroup =
    ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    effectiveGroupId.toLowerCase().includes('samambaia') ||
    effectiveGroupId.toLowerCase().includes('sammbia') ||
    Boolean(canWriteSequenciador);

  if (isSamambaiaGroup) {
    effectiveGroupId = 'samambaia';
    effectiveMestreId = effectiveMestreId || 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }

  const defaultVis = (isSamambaiaGroup || canWriteSequenciador) ? 'mestre_group' : 'private';

  const payload = {
    instrumentId: pattern.instrumentId || "",
    name: pattern.name || "Pattern Sans Nom",
    folder: pattern.folder || "Général",
    data: dataString,
    ownerId: ownerId || "",
    authorId: ownerId || "",
    uid: ownerId || "",
    visibility: visibility || defaultVis,
    mestreId: effectiveMestreId,
    groupId: effectiveGroupId || null,
    updatedAt: Date.now()
  };

  if (existingDocId) {
    const docRef = doc(db, CLOUD_PATTERNS_COLLECTION, existingDocId);
    await updateDoc(docRef, payload);
    return existingDocId;
  } else {
    const docRef = await addDoc(collection(db, CLOUD_PATTERNS_COLLECTION), {
      ...payload,
      createdAt: Date.now()
    });
    return docRef.id;
  }
}

export async function deleteCloudPattern(patternId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_PATTERNS_COLLECTION, patternId));
}

export async function renameCloudPattern(patternId: string, newName: string): Promise<void> {
  const docRef = doc(db, CLOUD_PATTERNS_COLLECTION, patternId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const docData = docSnap.data();
    const jsonStr = LZString.decompressFromBase64(docData.data);
    if (jsonStr) {
      const parsedPattern = JSON.parse(jsonStr) as SavedPattern;
      parsedPattern.name = newName;
      const newDataString = LZString.compressToBase64(JSON.stringify(parsedPattern));
      await updateDoc(docRef, { name: newName, data: newDataString });
    }
  }
}

export async function getCloudPattern(patternId: string): Promise<CloudPattern | null> {
  const docRef = doc(db, CLOUD_PATTERNS_COLLECTION, patternId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const jsonStr = LZString.decompressFromBase64(data.data);
    if (jsonStr) {
      const parsedPattern = JSON.parse(jsonStr) as SavedPattern;
      return {
        ...parsedPattern,
        id: docSnap.id,
        ownerId: data.ownerId,
        visibility: data.visibility,
        mestreId: data.mestreId,
        audioUrl: data.audioUrl
      };
    }
  }
  return null;
}
