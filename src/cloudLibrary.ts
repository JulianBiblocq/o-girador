import { db, storage } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc , query, limit, where, orderBy, or } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getVocalRecording } from './db';
import { CloudPreset, Preset, CatalogVisibility } from './types';
import LZString from 'lz-string';

export const CLOUD_PRESETS_COLLECTION = 'presets';

/**
 * Saves a preset to the Cloud.
 */
export async function savePresetToCloud(
  name: string,
  presetData: Preset,
  ownerId: string,
  visibility: CatalogVisibility,
  targetUserId?: string,
  audioUrl?: string,
  targetPresetId?: string,
  mestreId?: string
): Promise<string> {
  // Deep copy presetData to avoid modifying active app state
  const presetToSave = JSON.parse(JSON.stringify(presetData));

  // Upload local vocal recordings to Firebase Storage and add URLs to preset
  for (const track of presetToSave.tracks || []) {
    for (const pattern of track.patterns || []) {
      try {
        // If the pattern already has a valid Firebase Storage download URL, skip the upload
        if (pattern.vocalAudioUrl && pattern.vocalAudioUrl.startsWith('https://firebasestorage.googleapis.com/')) {
          continue;
        }
        const blob = await getVocalRecording(pattern.id);
        if (blob) {
          const storageRef = ref(storage, `vocalRecordings/${pattern.id}.ogg`);
          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);
          pattern.vocalAudioUrl = downloadUrl;
        }
      } catch (e) {
        console.error(`Failed to upload vocal recording for pattern ${pattern.id} to storage:`, e);
      }
    }
  }

  const dataString = LZString.compressToBase64(JSON.stringify(presetToSave));
  
  const docData: any = {
    name: name || "Preset Sans Nom",
    data: dataString,
    ownerId: ownerId || "",
    visibility: visibility || "private",
    targetUserId: targetUserId || null,
    mestreId: mestreId || null,
    updatedAt: Date.now()
  };
  if (audioUrl) docData.audioUrl = audioUrl;
  
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
 * Fetches all cloud presets the current user is allowed to see.
 * - Admin global presets (visible to everyone)
 * - Mestre group presets (visible if user is the Mestre, or if user is a student of this Mestre)
 * - Private presets (visible if user is owner)
 * - Specific user presets (visible if user is targetUserId or owner)
 */
export async function fetchCloudPresets(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur',
  mestreId: string | null
): Promise<CloudPreset[]> {
  const presets: CloudPreset[] = [];
  if (!userUid) return presets;
  const presetsRef = collection(db, CLOUD_PRESETS_COLLECTION);
  
  try {
    if (userRole === 'admin') {
      // Les admins chargent tout avec une limite généreuse
      const q = query(presetsRef, orderBy('createdAt', 'desc'), limit(1000));
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<CloudPreset, 'id'>;
        presets.push({ id: docSnap.id, ...data });
      });
    } else {
      // Pour éviter les index composites et ne pas rater de vieux presets avec une limite globale,
      // on lance plusieurs requêtes simples en parallèle et on fusionne les résultats.
      const queries = [
        getDocs(query(presetsRef, where('ownerId', '==', userUid))),
        getDocs(query(presetsRef, where('visibility', '==', 'admin_global'))),
        getDocs(query(presetsRef, where('visibility', '==', 'public'))),
        getDocs(query(presetsRef, where('targetUserId', '==', userUid)))
      ];
      
      if (mestreId) {
        queries.push(getDocs(query(presetsRef, where('ownerId', '==', mestreId))));
      }

      const snapshots = await Promise.all(queries);
      const uniqueIds = new Set<string>();
      
      snapshots.forEach(snapshot => {
        snapshot.forEach(docSnap => {
          if (!uniqueIds.has(docSnap.id)) {
            const data = docSnap.data() as Omit<CloudPreset, 'id'>;
            const isOwner = data.ownerId === userUid;
            const isAdminGlobal = data.visibility === 'admin_global';
            const isPublic = data.visibility === 'public';
            const isTarget = data.targetUserId === userUid;
            const isMestreGroup = data.visibility === 'mestre_group' && (userRole === 'mestre' ? data.ownerId === userUid : data.ownerId === mestreId);

            if (isOwner || isAdminGlobal || isPublic || isTarget || isMestreGroup) {
              uniqueIds.add(docSnap.id);
              presets.push({ id: docSnap.id, ...data });
            }
          }
        });
      });
      
      presets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {

    } else {
      console.error("Error fetching cloud presets:", err);
    }
  }
  
  return presets;
}

export async function getCloudPreset(presetId: string): Promise<Preset | null> {
  const { getDoc } = await import('firebase/firestore');
  const docSnap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
  if (docSnap.exists()) {
    const dataString = docSnap.data().data;
    try {
      if (dataString.startsWith('{')) {
        return JSON.parse(dataString) as Preset;
      }
      const jsonStr = LZString.decompressFromBase64(dataString);
      if (jsonStr) {
        return JSON.parse(jsonStr) as Preset;
      }
    } catch (e) {
      console.error("Error parsing preset data:", e);
    }
  }
  return null;
}

export async function deleteCloudPreset(presetId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
}

export async function renameCloudPreset(presetId: string, newName: string): Promise<void> {
  await updateDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId), { name: newName });
}
