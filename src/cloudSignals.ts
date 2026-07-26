import { collection, doc, setDoc, getDocs, deleteDoc, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase/config';
import { CloudRhythmSignal } from './types';

export const fetchMestreSignals = async (mestreId: string, lastVisibleDoc?: any): Promise<{ signals: CloudRhythmSignal[], lastDoc: any }> => {
  if (!mestreId) return { signals: [], lastDoc: null };
  try {
    const mestreIdsToFetch = mestreId === 'global' ? ['global'] : ['global', mestreId];
    // 🛡️ FIX (Audit): Added pagination support with startAfter
    let q = query(collection(db, 'mestre_signals'), where('mestreId', 'in', mestreIdsToFetch), orderBy('createdAt', 'desc'));
    if (lastVisibleDoc) {
      q = query(q, startAfter(lastVisibleDoc));
    }
    const querySnapshot = await getDocs(query(q, limit(50)));
    const signals: CloudRhythmSignal[] = [];
    querySnapshot.forEach((doc) => {
      signals.push(doc.data() as CloudRhythmSignal);
    });
    return {
      signals,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
    };
  } catch (err) {
    if (err && ((err as any).code === 'permission-denied' || String(err).includes('permission'))) {
      console.warn("Cloud features disabled: Missing or insufficient Firebase permissions for mestre signals.");
    } else {
      console.error('Error fetching mestre signals:', err);
    }
    return { signals: [], lastDoc: null };
  }
};

export const uploadMestreSignal = async (
  mestreId: string,
  name: string,
  base64Image: string
): Promise<CloudRhythmSignal | null> => {
  if (!mestreId || !base64Image) return null;
  try {
    // 🛡️ FIX (Audit): Secure ID generation
    const id = doc(collection(db, 'mestre_signals')).id;
    
    // Upload image to Storage
    const storageRef = ref(storage, `sinais/${mestreId}/${id}`);
    await uploadString(storageRef, base64Image, 'data_url');
    const imageUrl = await getDownloadURL(storageRef);

    // Save to Firestore
    const signalData: CloudRhythmSignal = {
      id,
      mestreId,
      name,
      imageUrl,
      createdAt: Date.now(),
    };

    await setDoc(doc(db, 'mestre_signals', id), signalData);
    return signalData;
  } catch (err) {
    console.error('Error uploading mestre signal:', err);
    return null;
  }
};

export const deleteMestreSignal = async (id: string, mestreId: string): Promise<boolean> => {
  if (!id || !mestreId) return false;
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'mestre_signals', id));

    // Delete from Storage
    const storageRef = ref(storage, `sinais/${mestreId}/${id}`);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.error('Error deleting mestre signal:', err);
    return false;
  }
};
