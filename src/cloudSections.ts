import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc , query, limit } from 'firebase/firestore';
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
  mestreId?: string
): Promise<string> {
  const dataString = LZString.compressToBase64(JSON.stringify(sectionData));
  
  const docRef = await addDoc(collection(db, CLOUD_SECTIONS_COLLECTION), {
    name,
    data: dataString, // Contains the full SavedSectionData
    ownerId,
    visibility,
    mestreId: mestreId || null,
    createdAt: Date.now()
  });
  
  return docRef.id;
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
  const sectionsRef = collection(db, CLOUD_SECTIONS_COLLECTION);
  
  try {
    const snapshot = await getDocs(query(sectionsRef, limit(50)));
    
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
        sections.push({
          id: docSnap.id,
          name: data.name,
          ownerId: data.ownerId,
          visibility: data.visibility,
          mestreId: data.mestreId,
          createdAt: data.createdAt,
          data: data.data // Keep compressed
        });
      }
    });
    
  } catch (err) {
    console.error("Error fetching cloud sections:", err);
  }
  
  return sections.sort((a, b) => a.name.localeCompare(b.name));
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
