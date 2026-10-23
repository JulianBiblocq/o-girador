
import { db } from '../../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { CatalogVisibility, SavedSectionData } from '../../types';
import LZString from 'lz-string';
import { CLOUD_SECTIONS_COLLECTION } from './cloudSectionsFetcher';

export async function saveSectionToCloud(
  name: string,
  sectionData: SavedSectionData,
  ownerId: string,
  visibility: CatalogVisibility,
  userRole?: string,
  existingDocId?: string,
  mestreId?: string,
  groupId?: string,
  canWriteSequenciador?: boolean
): Promise<string> {
  if (!ownerId) throw new Error("Utilisateur non connecté");

  if (!existingDocId && (!userRole || userRole === 'visiteur')) {
    const collRef = collection(db, CLOUD_SECTIONS_COLLECTION);
    const q = query(collRef, where('ownerId', '==', ownerId));
    const snapshot = await getCountFromServer(q);
    if (snapshot.data().count >= 2) {
      throw new Error("Vous avez atteint la limite de 2 morceaux gratuits");
    }
  }

  const dataString = LZString.compressToBase64(JSON.stringify(sectionData));
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
    name: name || "Section Sans Nom",
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
    const docRef = doc(db, CLOUD_SECTIONS_COLLECTION, existingDocId);
    await updateDoc(docRef, payload);
    return existingDocId;
  } else {
    const docRef = await addDoc(collection(db, CLOUD_SECTIONS_COLLECTION), {
      ...payload,
      createdAt: Date.now()
    });
    return docRef.id;
  }
}

export async function deleteCloudSection(sectionId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_SECTIONS_COLLECTION, sectionId));
}

export async function getCloudSectionData(sectionId: string): Promise<SavedSectionData | null> {
  const docSnap = await getDoc(doc(db, CLOUD_SECTIONS_COLLECTION, sectionId));
  if (docSnap.exists()) {
    const docData = docSnap.data();
    const jsonStr = LZString.decompressFromBase64(docData.data);
    if (jsonStr) {
      return JSON.parse(jsonStr) as SavedSectionData;
    }
  }
  return null;
}
