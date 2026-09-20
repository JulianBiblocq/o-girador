import { db, storage } from './firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, query, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getVocalRecording } from './db';
import { CloudPreset, Preset, CatalogVisibility } from './types';
import LZString from 'lz-string';
import { CLOUD_PRESETS_COLLECTION } from './cloudPresetsStorage';

export {
  CLOUD_PRESETS_COLLECTION, presetCache, getCloudPreset,
  deleteCloudPreset, renameCloudPreset, fetchStoragePresetsJSON
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

  const isSamambaiaGroup = effectiveGroupId.toLowerCase() === 'samambaia' ||
    effectiveGroupId.toLowerCase().includes('sammbia') || Boolean(canWriteSequenciador);

  if (isSamambaiaGroup) {
    // Normalisation canonique en minuscules pour Samambaia
    effectiveGroupId = 'samambaia';
    effectiveMestreId = effectiveMestreId || 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
  } else if (effectiveGroupId) {
    effectiveGroupId = effectiveGroupId.toLowerCase();
  }
  
  const docData: any = {
    name: name || "Preset Sans Nom",
    data: dataString,
    ownerId: ownerId || "",
    visibility: visibility || "private",
    targetUserId: targetUserId || null,
    mestreId: effectiveMestreId,
    updatedAt: Date.now()
  };
  if (effectiveGroupId) docData.groupId = effectiveGroupId;
  if (audioUrl !== undefined) docData.audioUrl = audioUrl;
  
  if (targetPresetId) {
    await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, targetPresetId), docData);
    return targetPresetId;
  } else {
    docData.createdAt = Date.now();
    const docRef = await addDoc(collection(db, CLOUD_PRESETS_COLLECTION), docData);
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
  if (!userUid) return presets;
  const presetsRef = collection(db, CLOUD_PRESETS_COLLECTION);
  
  try {
    if (userRole === 'admin') {
      const snapshot = await getDocs(query(presetsRef, limit(1000)));
      snapshot.forEach(docSnap => {
        presets.push({ id: docSnap.id, ...(docSnap.data() as Omit<CloudPreset, 'id'>) });
      });
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;
      const normalizedUserGroupId = groupId ? groupId.trim().toLowerCase() : '';
      const isSamambaiaGroup = normalizedUserGroupId === 'samambaia' || 
        normalizedUserGroupId.includes('sammbia') || mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

      if (groupId?.toLowerCase().includes('samambaia')) {
        myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      } else if (!myGroupMestreId && (isSamambaiaGroup || canWriteSequenciador)) {
        myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      }
      
      const queries = [
        getDocs(query(presetsRef, where('ownerId', '==', userUid), limit(100))),
        getDocs(query(presetsRef, where('visibility', '==', 'admin_global'), limit(100))),
        getDocs(query(presetsRef, where('visibility', '==', 'public'), limit(100))),
        getDocs(query(presetsRef, where('targetUserId', '==', userUid), limit(100)))
      ];
      
      if (myGroupMestreId) {
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        queries.push(getDocs(query(presetsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
      }

      // Requête systématique sur les variantes multi-casse dès qu'un groupe est présent
      const effectiveGroup = groupId || ((isSamambaiaGroup || canWriteSequenciador) ? 'samambaia' : null);
      if (effectiveGroup) {
        const norm = effectiveGroup.trim().toLowerCase();
        const isSam = norm.includes('samambaia') || norm.includes('sammbia') || canWriteSequenciador;
        const groupIdVariants = Array.from(new Set([
          effectiveGroup, norm, ...(isSam ? ['samambaia', 'Samambaia', 'SAMAMBAIA'] : [effectiveGroup, norm])
        ]));
        queries.push(getDocs(query(presetsRef, where('groupId', 'in', groupIdVariants), limit(100))));
      }

      const settled = await Promise.allSettled(queries);
      const uniqueIds = new Set<string>();
      
      settled.forEach(res => {
        if (res.status === 'fulfilled') {
          res.value.forEach(docSnap => {
            if (!uniqueIds.has(docSnap.id)) {
              const data = docSnap.data() as Omit<CloudPreset, 'id'>;
              const isOwner = data.ownerId === userUid;
              const isAdminGlobal = data.visibility === 'admin_global';
              const isPublic = data.visibility === 'public';
              const isTarget = data.targetUserId === userUid;
              const matchesMestre = myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId);
              
              // Comparaison insensible à la casse
              const dataGroupIdNorm = String((data as any).groupId || '').toLowerCase();
              const userGroupNorm = String(groupId || (isSamambaiaGroup || canWriteSequenciador ? 'samambaia' : '')).toLowerCase();
              const matchesGroup = Boolean(
                (userGroupNorm && dataGroupIdNorm && dataGroupIdNorm === userGroupNorm) ||
                ((userGroupNorm.includes('samambaia') || isSamambaiaGroup || canWriteSequenciador) && (dataGroupIdNorm === 'samambaia' || dataGroupIdNorm.includes('sammbia')))
              );
              const isMestreGroup = (data.visibility === 'mestre_group' || !data.visibility) && (matchesMestre || matchesGroup);
              const isMemberOrEleve = userRole === 'membre' || userRole === 'eleve';

              if (
                isOwner || isAdminGlobal || isPublic || isTarget || isMestreGroup || 
                matchesGroup || matchesMestre || 
                ((isMemberOrEleve || canWriteSequenciador) && (isSamambaiaGroup || matchesGroup || matchesMestre))
              ) {
                uniqueIds.add(docSnap.id);
                presets.push({ id: docSnap.id, ...data });
              }
            }
          });
        } else {
          console.warn("fetchCloudPresets - Avertissement sous-requête partielle :", res.reason);
        }
      });
      
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn("fetchCloudPresets - Avertissement requête globale :", err);
  }
  
  return presets;
}
