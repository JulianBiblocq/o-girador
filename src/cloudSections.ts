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
  mestreId?: string,
  existingDocId?: string,
  userRole?: string
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
  
  const payload = {
    name: name || "Section Sans Nom",
    data: dataString,
    ownerId: ownerId || "",
    authorId: ownerId || "", // Fallback for rules
    uid: ownerId || "", // Fallback for rules
    visibility: visibility || "private",
    mestreId: mestreId || null,
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
  userRole: 'admin' | 'mestre' | 'eleve' | 'visiteur',
  mestreId: string | null
): Promise<CloudSection[]> {
  const sections: CloudSection[] = [];
  if (!userUid) return sections;
  const sectionsRef = collection(db, CLOUD_SECTIONS_COLLECTION);
  
  try {
    // We use a simple query by date to avoid requiring composite indexes for complex OR conditions
    // The filtering is done in JS to ensure all visibility rules (admin_global, mestre_group) are correctly applied
    const q = query(
      sectionsRef,
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const snapshot = await getDocs(q);
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const isOwner = data.ownerId === userUid;
      const isAdminGlobal = data.visibility === 'admin_global';
      const isPublic = data.visibility === 'public';
      const isMestreGroup = data.visibility === 'mestre_group' && (data.mestreId === mestreId || data.ownerId === mestreId);
      const isSysAdmin = userRole === 'admin';
      
      if (isOwner || isAdminGlobal || isPublic || isMestreGroup || isSysAdmin) {
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
