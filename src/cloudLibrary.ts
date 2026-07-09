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
  targetUserId?: string
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
  if (!userUid) return presets;
  const presetsRef = collection(db, CLOUD_PRESETS_COLLECTION);
  
  try {
    // 🛡️ FIX (Audit): Secure query with where and orderBy, remove JS filtering
    const q = query(
      presetsRef,
      or(
        where('ownerId', '==', userUid),
        where('visibility', '==', 'public'),
        where('targetUserId', '==', userUid)
      ),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    
    snapshot.forEach(doc => {
      const data = doc.data() as Omit<CloudPreset, 'id'>;
      presets.push({ id: doc.id, ...data });
    });
    
  } catch (err) {
    console.error("Error fetching cloud presets:", err);
  }
  
  return presets;
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
