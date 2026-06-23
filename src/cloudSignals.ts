import { collection, doc, setDoc, getDocs, deleteDoc, query, where, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase/config';
import { CloudRhythmSignal } from './types';

export const fetchMestreSignals = async (mestreId: string): Promise<CloudRhythmSignal[]> => {
  if (!mestreId) return [];
  try {
    const mestreIdsToFetch = mestreId === 'global' ? ['global'] : ['global', mestreId];
    const q = query(collection(db, 'mestre_signals'), where('mestreId', 'in', mestreIdsToFetch));
    const querySnapshot = await getDocs(query(q, limit(50)));
    const signals: CloudRhythmSignal[] = [];
    querySnapshot.forEach((doc) => {
      signals.push(doc.data() as CloudRhythmSignal);
    });
    return signals;
  } catch (err) {
    console.error('Error fetching mestre signals:', err);
    return [];
  }
};

export const uploadMestreSignal = async (
  mestreId: string,
  name: string,
  base64Image: string
): Promise<CloudRhythmSignal | null> => {
  if (!mestreId || !base64Image) return null;
  try {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    
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
