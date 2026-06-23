import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc , query, limit } from 'firebase/firestore';
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
  targetUserId?: string
): Promise<string> {
  const dataString = LZString.compressToBase64(JSON.stringify(presetData));
  
  const docRef = await addDoc(collection(db, CLOUD_PRESETS_COLLECTION), {
    name,
    data: dataString,
    ownerId,
    visibility,
    targetUserId: targetUserId || null,
    createdAt: Date.now()
  });
  
  return docRef.id;
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
  const presetsRef = collection(db, CLOUD_PRESETS_COLLECTION);
  
  try {
    const snapshot = await getDocs(query(presetsRef, limit(50))); // Client-side filtering for simplicity due to multiple OR conditions
    
    snapshot.forEach(doc => {
      const data = doc.data() as Omit<CloudPreset, 'id'>;
      let canSee = false;
      
      if (data.visibility === 'admin_global') {
        canSee = true;
      } else if (data.visibility === 'private') {
        canSee = userUid === data.ownerId;
      } else if (data.visibility === 'mestre_group') {
        canSee = (userUid === data.ownerId) || (mestreId === data.ownerId);
      } else if (data.visibility === 'specific_user') {
        canSee = (userUid === data.ownerId) || (userUid === data.targetUserId);
      }
      
      if (canSee) {
        presets.push({ id: doc.id, ...data });
      }
    });
    
  } catch (err) {
    console.error("Error fetching cloud presets:", err);
  }
  
  return presets.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCloudPreset(presetId: string): Promise<Preset | null> {
  const { getDoc } = await import('firebase/firestore');
  const docSnap = await getDoc(doc(db, CLOUD_PRESETS_COLLECTION, presetId));
  if (docSnap.exists()) {
    const dataString = docSnap.data().data;
    const jsonStr = LZString.decompressFromBase64(dataString);
    if (jsonStr) {
      return JSON.parse(jsonStr) as Preset;
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
