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
      if (typeof dataString === 'object' && dataString !== null) {
        const parsed = dataString as Preset;
        presetCache.set(presetId, parsed);
        return parsed;
      }
      if (typeof dataString === 'string') {
        if (dataString.startsWith('{')) {
          const parsed = JSON.parse(dataString) as Preset;
          presetCache.set(presetId, parsed);
          return parsed;
        }
        const jsonStr = LZString.decompressFromBase64(dataString) || LZString.decompressFromUTF16(dataString);
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr) as Preset;
          presetCache.set(presetId, parsed);
          return parsed;
        }
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
  presetCache.delete(presetId);
  await deleteDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
}

/**
 * Renomme un preset Cloud dans Firestore.
 */
export async function renameCloudPreset(presetId: string, newName: string): Promise<void> {
  const cached = presetCache.get(presetId);
  if (cached && cached.metadata) {
    cached.metadata.toada = newName;
  }
  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), { name: newName });
}

/**
 * Cache mémoire pour les presets listés depuis Firebase Storage, indexés par groupId.
 * TTL par défaut : 15 minutes pour éviter d'interroger le bucket à répétition.
 */
interface StoragePresetsCacheEntry {
  timestamp: number;
  presets: CloudPreset[];
}
const storagePresetsGroupCache = new Map<string, StoragePresetsCacheEntry>();

/**
 * Récupère les fichiers .json de presets depuis le dossier Firebase Storage documents/${groupId}/sequencer/
 * Supporte le repli multi-casse documents/Samambaia/sequencer et documents/samambaia/sequencer.
 * Utilise strictement le cache mémoire pour éviter les requêtes réseau superflues et préserver les quotas.
 */
export async function fetchStoragePresetsJSON(groupId: string, forceRefresh = false): Promise<CloudPreset[]> {
  if (!groupId) return [];

  const cacheKey = groupId.toLowerCase().trim();
  const cachedGroup = storagePresetsGroupCache.get(cacheKey);
  const now = Date.now();
  const STORAGE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  // Si le résultat est déjà en cache et toujours frais, le renvoyer directement sans requêter Storage
  if (!forceRefresh && cachedGroup && (now - cachedGroup.timestamp < STORAGE_CACHE_TTL)) {
    return cachedGroup.presets;
  }

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

          // 1. Vérification stricte en mémoire : si le preset est déjà en cache, aucun téléchargement réseau
          if (presetCache.has(itemRef.name)) {
            const data = presetCache.get(itemRef.name)!;
            presets.push({
              id: itemRef.name,
              name: data.metadata?.toada || (data as any).name || itemRef.name.replace('.json', ''),
              data: LZString.compressToBase64(JSON.stringify(data)),
              ownerId: 'storage',
              visibility: 'mestre_group',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              groupId: groupId.toLowerCase(),
              isFromStorage: true
            } as any);
            continue;
          }

          // 2. Fichier non répertorié : téléchargement unique depuis Firebase Storage
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
      // En cas d'erreur de quota sur listAll, si on a un ancien cache, le conserver
      if (cachedGroup && cachedGroup.presets.length > 0) {
        return cachedGroup.presets;
      }
    }
  }

  // Mise à jour du cache de groupe
  storagePresetsGroupCache.set(cacheKey, {
    timestamp: now,
    presets,
  });

  return presets;
}

/**
 * Vérifie si un preset Cloud est accessible pour l'utilisateur.
 */
export function isPresetAuthorized(
  data: Omit<CloudPreset, 'id'>,
  userUid: string,
  userRole: string,
  myGroupMestreId: string | null,
  groupId: string | null | undefined,
  isSamambaiaGroup: boolean,
  canWriteSequenciador?: boolean
): boolean {
  if (!data) return false;

  // 1. Presets publics, globaux ou appartenant directement à l'utilisateur
  if (
    data.visibility === 'admin_global' ||
    data.visibility === 'public' ||
    (userUid && data.ownerId === userUid) ||
    (userUid && data.targetUserId === userUid)
  ) {
    return true;
  }

  // 2. Normalisation des groupes
  const dataGroupIdNorm = String((data as any).groupId || (data as any).groupName || (data as any).group || '').toLowerCase().trim();
  const userGroupNorm = String(groupId || (isSamambaiaGroup || canWriteSequenciador ? 'samambaia' : '')).toLowerCase().trim();

  const isSamambaiaPreset =
    dataGroupIdNorm.includes('samambaia') ||
    dataGroupIdNorm.includes('sammbia') ||
    data.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    data.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

  const matchesGroup = Boolean(
    (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
    ((userGroupNorm.includes('samambaia') || isSamambaiaGroup || canWriteSequenciador) && isSamambaiaPreset)
  );

  const matchesMestre = Boolean(
    myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId)
  );

  // 3. Pour un élève, membre, ou utilisateur du groupe (y compris Samambaia par défaut),
  // tous les morceaux du groupe ou partagés par le mestre sont accessibles
  const isMemberOrEleve = userRole === 'eleve' || userRole === 'membre' || userRole === 'mestre' || userRole === 'admin';

  if (matchesGroup || matchesMestre) {
    return true;
  }

  if ((isSamambaiaGroup || userGroupNorm.includes('samambaia') || isMemberOrEleve) && isSamambaiaPreset) {
    return true;
  }

  // Visibilité groupe générale
  if ((data.visibility as any) === 'group' || data.visibility === 'mestre_group' || !data.visibility) {
    if (matchesGroup || matchesMestre || isSamambaiaGroup || isMemberOrEleve) {
      return true;
    }
  }

  return false;
}
