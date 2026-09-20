import { db, storage } from './firebase/config';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { CloudPreset, Preset } from './types';
import LZString from 'lz-string';

export const CLOUD_PRESETS_COLLECTION = 'presets';

export const presetCache = new Map<string, Preset>();

/**
 * Récupère un preset Cloud depuis Firestore ou le cache mémoire.
 */
export async function getCloudPreset(presetId: string): Promise<Preset | null> {
  if (presetCache.has(presetId)) {
    return presetCache.get(presetId) || null;
  }
  const docSnap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
  if (docSnap.exists()) {
    const dataString = docSnap.data().data;
    try {
      if (typeof dataString === 'string' && dataString.startsWith('{')) {
        return JSON.parse(dataString) as Preset;
      }
      const jsonStr = LZString.decompressFromBase64(dataString);
      if (jsonStr) {
        return JSON.parse(jsonStr) as Preset;
      }
    } catch (e) {
      console.error("getCloudPreset - Erreur lors de l'analyse des données :", e);
    }
  }
  return null;
}

/**
 * Supprime un preset Cloud de Firestore.
 */
export async function deleteCloudPreset(presetId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
}

/**
 * Renomme un preset Cloud dans Firestore.
 */
export async function renameCloudPreset(presetId: string, newName: string): Promise<void> {
  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), { name: newName });
}

/**
 * Récupère les fichiers .json de presets depuis le dossier Firebase Storage documents/${groupId}/sequencer/
 * Supporte le repli multi-casse documents/Samambaia/sequencer et documents/samambaia/sequencer.
 */
export async function fetchStoragePresetsJSON(groupId: string): Promise<CloudPreset[]> {
  if (!groupId) return [];
  const presets: CloudPreset[] = [];
  const seenIds = new Set<string>();

  const isSamambaia = groupId.toLowerCase().includes('samambaia') || groupId.toLowerCase().includes('sammbia');
  const candidateFolders = Array.from(new Set([
    `documents/${groupId}/sequencer`,
    `documents/${groupId.toLowerCase()}/sequencer`,
    ...(isSamambaia ? ['documents/Samambaia/sequencer', 'documents/samambaia/sequencer'] : [])
  ]));

  for (const folderPath of candidateFolders) {
    try {
      const folderRef = ref(storage, folderPath);
      const res = await listAll(folderRef);
      for (const itemRef of res.items) {
        if (itemRef.name.endsWith('.json') && !seenIds.has(itemRef.name)) {
          seenIds.add(itemRef.name);
          try {
            const url = await getDownloadURL(itemRef);
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              presetCache.set(itemRef.name, data as Preset);
              presets.push({
                id: itemRef.name,
                name: data.metadata?.toada || data.name || itemRef.name.replace('.json', ''),
                data: LZString.compressToBase64(JSON.stringify(data)),
                ownerId: 'storage',
                visibility: 'mestre_group',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                groupId: groupId.toLowerCase(),
                isFromStorage: true
              } as any);
            }
          } catch (e) {
            console.warn(`fetchStoragePresetsJSON - Échec du chargement de ${itemRef.fullPath}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn(`fetchStoragePresetsJSON - Échec du listage pour ${folderPath}:`, err);
    }
  }

  return presets;
}
