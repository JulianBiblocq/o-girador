import { db, storage } from './firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, query, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getVocalRecording } from './db';
import { CloudPreset, Preset, CatalogVisibility } from './types';
import LZString from 'lz-string';
import { CLOUD_PRESETS_COLLECTION, isPresetAuthorized, presetCache } from './cloudPresetsStorage';

export {
  CLOUD_PRESETS_COLLECTION, presetCache, getCloudPreset,
  deleteCloudPreset, renameCloudPreset, fetchStoragePresetsJSON, isPresetAuthorized
} from './cloudPresetsStorage';

/**
 * Enregistre un preset dans Firestore Cloud.
 */
export async function savePresetToCloud(
  name: string,
  presetData: Preset,
  ownerId: string,
  visibility: CatalogVisibility,
  targetUserId?: string,
  audioUrl?: string | null,
  targetPresetId?: string,
  mestreId?: string,
  groupId?: string,
  canWriteSequenciador?: boolean
): Promise<string> {
  const presetToSave = JSON.parse(JSON.stringify(presetData));

  // Téléversement des enregistrements vocaux locaux vers Firebase Storage
  for (const track of presetToSave.tracks || []) {
    for (const pattern of track.patterns || []) {
      try {
        if (pattern.vocalAudioUrl?.startsWith('https://firebasestorage.googleapis.com/')) continue;
        const blob = await getVocalRecording(pattern.id);
        if (blob) {
          const storageRef = ref(storage, `vocalRecordings/${pattern.id}.ogg`);
          await uploadBytes(storageRef, blob);
          pattern.vocalAudioUrl = await getDownloadURL(storageRef);
        }
      } catch (e) {
        console.error(`savePresetToCloud - Échec upload vocal pour motif ${pattern.id}:`, e);
      }
    }
  }

  const dataString = LZString.compressToBase64(JSON.stringify(presetToSave));
  let effectiveGroupId = groupId ? groupId.trim() : '';
  let effectiveMestreId = mestreId || null;
  const isSamambaiaGroup =
    ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    effectiveGroupId.toLowerCase().includes('samambaia') ||
    effectiveGroupId.toLowerCase().includes('sammbia') ||
    Boolean(canWriteSequenciador);

  if (isSamambaiaGroup) {
    // Normalisation canonique en minuscules pour Samambaia
    effectiveGroupId = 'samambaia';
    effectiveMestreId = effectiveMestreId || 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }

  const defaultVis = (isSamambaiaGroup || canWriteSequenciador) ? 'mestre_group' : 'private';
  const docData: any = {
    name: name || "Preset Sans Nom",
    data: dataString,
    ownerId: ownerId || "",
    visibility: visibility || defaultVis,
    targetUserId: targetUserId || null,
    mestreId: effectiveMestreId,
    updatedAt: Date.now()
  };
  if (effectiveGroupId) docData.groupId = effectiveGroupId;
  if (audioUrl !== undefined) docData.audioUrl = audioUrl;
  
  if (targetPresetId) {
    await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, targetPresetId), docData);
    presetCache.set(targetPresetId, presetToSave);
    return targetPresetId;
  } else {
    docData.createdAt = Date.now();
    const docRef = await addDoc(collection(db, CLOUD_PRESETS_COLLECTION), docData);
    presetCache.set(docRef.id, presetToSave);
    return docRef.id;
  }
}

/**
 * Récupère tous les presets Cloud autorisés pour l'utilisateur courant.
 */
export async function fetchCloudPresets(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'membre' | 'visiteur' | string,
  mestreId: string | null,
  groupId?: string | null,
  canWriteSequenciador?: boolean
): Promise<CloudPreset[]> {
  const presets: CloudPreset[] = [];
  const presetsRef = collection(db, CLOUD_PRESETS_COLLECTION);
  
  try {
    if (userRole === 'admin') {
      const snapshot = await getDocs(query(presetsRef, limit(1000)));
      snapshot.forEach(docSnap => {
        presets.push({ id: docSnap.id, ...(docSnap.data() as Omit<CloudPreset, 'id'>) });
      });
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      const isJulian = userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
      const isOtherGroup = Boolean(
        normalizedUserGroupId &&
        !normalizedUserGroupId.includes('samambaia') &&
        !normalizedUserGroupId.includes('sammbia')
      );
      const isSamambaiaGroup = !isOtherGroup;
      let myGroupMestreId = isSamambaiaGroup ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : (mestreId || null);

      const queries = [
        getDocs(query(presetsRef, where('visibility', '==', 'admin_global'), limit(100))),
        getDocs(query(presetsRef, where('visibility', '==', 'public'), limit(100)))
      ];

      if (userUid) {
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', userUid), limit(100))));
        queries.push(getDocs(query(presetsRef, where('targetUserId', '==', userUid), limit(100))));
      }

      if (isSamambaiaGroup) {
        // Récupération systématique des presets Samambaia (mestre_group)
        queries.push(getDocs(query(presetsRef, where('groupId', 'in', ['samambaia', 'Samambaia', 'SAMAMBAIA']), limit(100))));
        queries.push(getDocs(query(presetsRef, where('mestreId', '==', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'), limit(100))));
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'), limit(100))));
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'), limit(100))));
      } else if (groupId) {
        queries.push(getDocs(query(presetsRef, where('groupId', '==', groupId), limit(100))));
        if (myGroupMestreId) {
          queries.push(getDocs(query(presetsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
          queries.push(getDocs(query(presetsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        }
      }

      const settled = await Promise.allSettled(queries);
      const uniqueIds = new Set<string>();
      
      settled.forEach(res => {
        if (res.status === 'fulfilled') {
          res.value.forEach(docSnap => {
            if (!uniqueIds.has(docSnap.id)) {
              const data = docSnap.data() as Omit<CloudPreset, 'id'>;
              if (isPresetAuthorized(data, userUid, userRole, myGroupMestreId, groupId, isSamambaiaGroup, canWriteSequenciador)) {
                uniqueIds.add(docSnap.id);
                presets.push({ id: docSnap.id, ...data });
              }
            }
          });
        }
      });
      
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn("fetchCloudPresets - Avertissement requête globale :", err);
  }
  
  return presets;
}
