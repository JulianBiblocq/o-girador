import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc , query, limit, where, orderBy, or, getCountFromServer } from 'firebase/firestore';
import { CloudSection, CatalogVisibility, SavedSectionData } from './types';
import LZString from 'lz-string';

export const CLOUD_SECTIONS_COLLECTION = 'sections';

/**
 * Saves a section to the Cloud.
 */
export async function saveSectionToCloud(
  name: string,
  sectionData: SavedSectionData,
  ownerId: string,
  visibility: CatalogVisibility,
  userRole?: string,
  existingDocId?: string,
  mestreId?: string,
  groupId?: string
): Promise<string> {
  if (!ownerId) throw new Error("Utilisateur non connecté");

  // Vérification de la limite pour les comptes gratuits (visiteur uniquement) s'il s'agit d'une nouvelle création
  if (!existingDocId && (!userRole || userRole === 'visiteur')) {
    const collRef = collection(db, CLOUD_SECTIONS_COLLECTION);
    const q = query(collRef, where('ownerId', '==', ownerId));
    const snapshot = await getCountFromServer(q);
    if (snapshot.data().count >= 2) {
      throw new Error("Vous avez atteint la limite de 2 morceaux gratuits");
    }
  }

  const dataString = LZString.compressToBase64(JSON.stringify(sectionData));
  const finalMestreId = (userRole === 'mestre' || userRole === 'mestri') ? ownerId : (mestreId || null);
  
  const payload = {
    name: name || "Section Sans Nom",
    data: dataString,
    ownerId: ownerId || "",
    authorId: ownerId || "", // Fallback for rules
    uid: ownerId || "", // Fallback for rules
    visibility: visibility || "private",
    mestreId: finalMestreId,
    groupId: groupId || null,
    updatedAt: Date.now()
  };

  if (existingDocId) {
    const docRef = doc(db, CLOUD_SECTIONS_COLLECTION, existingDocId);
    await updateDoc(docRef, payload);
    return existingDocId;
  } else {
    const docRef = await addDoc(collection(db, CLOUD_SECTIONS_COLLECTION), {
      ...payload,
      createdAt: Date.now()
    });
    return docRef.id;
  }
}

/**
 * Fetches all cloud sections the current user is allowed to see.
 */
export async function fetchCloudSections(
  userUid: string | null,
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur' | string,
  mestreId: string | null,
  groupId?: string | null
): Promise<CloudSection[]> {
  const sections: CloudSection[] = [];
  if (!userUid) return sections;
  const sectionsRef = collection(db, CLOUD_SECTIONS_COLLECTION);
  
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
          console.warn("Could not resolve mestre for group in fetchCloudSections:", e);
        }
      }
    }

    const promises = [];
    const isSysAdmin = userRole === 'admin';

    if (isSysAdmin) {
      promises.push(getDocs(query(sectionsRef, orderBy('createdAt', 'desc'), limit(200))));
    } else {
      // Requêtes ciblées parallélisées sans orderBy combiné pour éviter d'exiger des index composites
      promises.push(getDocs(query(sectionsRef, where('ownerId', '==', userUid), limit(100))));
      promises.push(getDocs(query(sectionsRef, where('visibility', 'in', ['admin_global', 'public']), limit(100))));
      
      if (groupId) {
        promises.push(getDocs(query(sectionsRef, where('groupId', 'in', [groupId, groupId.toLowerCase(), 'Samambaia', 'samambaia']), limit(100))));
      }
      if (myGroupMestreId) {
        promises.push(getDocs(query(sectionsRef, where('ownerId', '==', myGroupMestreId), limit(100))));
        promises.push(getDocs(query(sectionsRef, where('mestreId', '==', myGroupMestreId), limit(100))));
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
        sections.push({
          id: docSnap.id,
          name: data.name,
          ownerId: data.ownerId,
          visibility: data.visibility,
          mestreId: data.mestreId,
          createdAt: data.createdAt,
          audioUrl: data.audioUrl,
          data: data.data // Keep compressed
        });
      }
    });

    // Tri global par date décroissante
    sections.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {

    } else {
      console.error("Error fetching cloud sections:", err);
    }
  }
  
  return sections;
}

export async function deleteCloudSection(sectionId: string): Promise<void> {
  await deleteDoc(doc(db, CLOUD_SECTIONS_COLLECTION, sectionId));
}

export async function getCloudSectionData(sectionId: string): Promise<SavedSectionData | null> {
  const docSnap = await getDoc(doc(db, CLOUD_SECTIONS_COLLECTION, sectionId));
  if (docSnap.exists()) {
    const docData = docSnap.data();
    const jsonStr = LZString.decompressFromBase64(docData.data);
    if (jsonStr) {
      return JSON.parse(jsonStr) as SavedSectionData;
    }
  }
  return null;
}
