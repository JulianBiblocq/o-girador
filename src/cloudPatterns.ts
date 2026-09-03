import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc , query, limit, where, orderBy, or, getCountFromServer } from 'firebase/firestore';
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
  existingDocId?: string,
  userRole?: string,
  groupId?: string
): Promise<string> {
  if (!ownerId) throw new Error("Utilisateur non connecté");

  // Vérification de la limite pour les comptes gratuits (visiteur uniquement) s'il s'agit d'une nouvelle création
  if (!existingDocId && (!userRole || userRole === 'visiteur')) {
    const collRef = collection(db, CLOUD_PATTERNS_COLLECTION);
    const q = query(collRef, where('ownerId', '==', ownerId));
    const snapshot = await getCountFromServer(q);
    if (snapshot.data().count >= 2) {
      throw new Error("Vous avez atteint la limite de 2 patterns gratuits");
    }
  }

  const dataString = LZString.compressToBase64(JSON.stringify(pattern));
  const finalMestreId = (userRole === 'mestre' || userRole === 'mestri') ? ownerId : (mestreId || null);
  
  const payload = {
    instrumentId: pattern.instrumentId || "",
    name: pattern.name || "Pattern Sans Nom",
    folder: pattern.folder || "Général",
    data: dataString, // Contains the full SavedPattern
    ownerId: ownerId || "",
    authorId: ownerId || "", // Fallback for rules
    uid: ownerId || "", // Fallback for rules
    visibility: visibility || "private",
    mestreId: finalMestreId,
    groupId: groupId || null,
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
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string,
  mestreId: string | null,
  groupId?: string | null
): Promise<CloudPattern[]> {
  const patterns: CloudPattern[] = [];
  if (!userUid) return patterns;
  const patternsRef = collection(db, CLOUD_PATTERNS_COLLECTION);
  
  try {
    let myGroupMestreId = (userRole === 'mestre' || userRole === 'mestri') ? userUid : mestreId;

    if (!myGroupMestreId && groupId) {
      if (groupId.toLowerCase() === 'samambaia') {
        myGroupMestreId = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
      } else {
        try {
          const mestreQ = query(
            collection(db, 'users'),
            where('groupId', 'in', [groupId, groupId.toLowerCase(), 'Samambaia', 'samambaia']),
            where('role', '==', 'mestre')
          );
          const mestreSnap = await getDocs(mestreQ);
          if (!mestreSnap.empty) {
            myGroupMestreId = mestreSnap.docs[0].id;
          }
        } catch (e) {
          console.warn("Could not resolve mestre for group in fetchCloudPatterns:", e);
        }
      }
    }

    const promises = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(patternsRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      // Requêtes ciblées parallélisées sans orderBy combiné pour éviter d'exiger des index composites
      promises.push(getDocs(query(patternsRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(patternsRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));
      
      if (groupId) {
        promises.push(getDocs(query(patternsRef, where('groupId', 'in', [groupId, groupId.toLowerCase(), 'Samambaia', 'samambaia']), limit(100))));
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(patternsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        promises.push(getDocs(query(patternsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
      }
    }

    const snapshots = await Promise.all(promises);
    const uniqueDocs = new Map();

    snapshots.forEach(snapshot => {
      snapshot.forEach(docSnap => {
        if (!uniqueDocs.has(docSnap.id)) {
          uniqueDocs.set(docSnap.id, docSnap);
        }
      });
    });
    
    uniqueDocs.forEach(docSnap => {
      const data = docSnap.data();
      const isOwner = data.ownerId === userUid;
      const isAdminGlobal = data.visibility === 'admin_global';
      const isPublic = data.visibility === 'public';
      const matchesMestre = myGroupMestreId && (data.mestreId === myGroupMestreId || data.ownerId === myGroupMestreId);
      const matchesGroup = groupId && data.groupId && String(data.groupId).toLowerCase() === String(groupId).toLowerCase();
      const isMestreGroup = data.visibility === 'mestre_group' && (matchesMestre || matchesGroup);
      
      if (isSysAdmin || isOwner || isAdminGlobal || isPublic || isMestreGroup) {
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

    // Tri global par date décroissante
    patterns.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {

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
