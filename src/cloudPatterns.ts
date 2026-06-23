import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { CloudPattern, CatalogVisibility, SavedPattern } from './types';
import LZString from 'lz-string';

export const CLOUD_PATTERNS_COLLECTION = 'patterns';

/**
 * Saves a pattern to the Cloud.
 */
export async function savePatternToCloud(
  pattern: SavedPattern,
  ownerId: string,
  visibility: CatalogVisibility,
  mestreId?: string
): Promise<string> {
  const dataString = LZString.compressToBase64(JSON.stringify(pattern));
  
  const docRef = await addDoc(collection(db, CLOUD_PATTERNS_COLLECTION), {
    instrumentId: pattern.instrumentId,
    name: pattern.name,
    folder: pattern.folder,
    data: dataString, // Contains the full SavedPattern
    ownerId,
    visibility,
    mestreId: mestreId || null,
    createdAt: Date.now()
  });
  
  return docRef.id;
}

/**
 * Fetches all cloud patterns the current user is allowed to see.
 */
export async function fetchCloudPatterns(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur',
  mestreId: string | null
): Promise<CloudPattern[]> {
  const patterns: CloudPattern[] = [];
  const patternsRef = collection(db, CLOUD_PATTERNS_COLLECTION);
  
  try {
    const snapshot = await getDocs(patternsRef);
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      let canSee = false;
      
      if (userRole === 'admin' || data.visibility === 'admin_global') {
        canSee = true;
      } else if (data.visibility === 'private') {
        canSee = userUid === data.ownerId;
      } else if (data.visibility === 'mestre_group') {
        canSee = (userUid === data.ownerId) || (mestreId === data.ownerId) || (data.mestreId && data.mestreId === mestreId);
      }
      
      if (canSee) {
        const jsonStr = LZString.decompressFromBase64(data.data);
        if (jsonStr) {
          const parsedPattern = JSON.parse(jsonStr) as SavedPattern;
          patterns.push({
            ...parsedPattern,
            id: docSnap.id, // override with cloud ID
            ownerId: data.ownerId,
            visibility: data.visibility,
            mestreId: data.mestreId
          });
        }
      }
    });
    
  } catch (err) {
    console.error("Error fetching cloud patterns:", err);
  }
  
  return patterns.sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteCloudPattern(patternId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_PATTERNS_COLLECTION, patternId));
}

export async function renameCloudPattern(patternId: string, newName: string): Promise<void> {
  // We need to fetch it first because the name is also inside the LZString data!
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
