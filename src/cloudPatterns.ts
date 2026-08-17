import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc , query, limit, where, orderBy, or } from 'firebase/firestore';
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
  mestreId?: string,
  existingDocId?: string
): Promise<string> {
  if (!ownerId) throw new Error("Utilisateur non connecté");

  const dataString = LZString.compressToBase64(JSON.stringify(pattern));
  
  const payload = {
    instrumentId: pattern.instrumentId,
    name: pattern.name,
    folder: pattern.folder,
    data: dataString, // Contains the full SavedPattern
    ownerId,
    authorId: ownerId, // Fallback for rules
    uid: ownerId, // Fallback for rules
    visibility,
    mestreId: mestreId || null,
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

/**
 * Fetches all cloud patterns the current user is allowed to see.
 */
export async function fetchCloudPatterns(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur',
  mestreId: string | null
): Promise<CloudPattern[]> {
  const patterns: CloudPattern[] = [];
  if (!userUid) return patterns;
  const patternsRef = collection(db, CLOUD_PATTERNS_COLLECTION);
  
  try {
    // We use a simple query by date to avoid requiring composite indexes for complex OR conditions
    // The filtering is done in JS to ensure all visibility rules are correctly applied
    const q = query(
      patternsRef,
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const snapshot = await getDocs(q);
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const isOwner = data.ownerId === userUid;
      const isAdminGlobal = data.visibility === 'admin_global';
      const isMestreGroup = data.visibility === 'mestre_group' && data.mestreId === mestreId;
      const isSysAdmin = userRole === 'admin';
      
      if (isOwner || isAdminGlobal || isMestreGroup || isSysAdmin) {
        const jsonStr = LZString.decompressFromBase64(data.data);
        if (jsonStr) {
          const parsedPattern = JSON.parse(jsonStr) as SavedPattern;
          patterns.push({
            ...parsedPattern,
            id: docSnap.id,
            ownerId: data.ownerId,
            visibility: data.visibility,
            mestreId: data.mestreId,
            audioUrl: data.audioUrl
          });
        }
      }
    });
    
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {
      console.warn("Cloud features disabled: Missing or insufficient Firebase permissions for cloud patterns.");
    } else {
      console.error("Error fetching cloud patterns:", err);
    }
  }
  
  return patterns;
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
