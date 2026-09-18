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

    } else {
      console.error('Error fetching mestre signals:', err);
    }
    return { signals: [], lastDoc: null };
  }
};

export interface UploadSignalResult {
  success: boolean;
  signal?: CloudRhythmSignal;
  error?: string;
}

export const uploadMestreSignal = async (
  mestreId: string,
  name: string,
  base64Image: string
): Promise<UploadSignalResult> => {
  if (!mestreId) {
    return { success: false, error: 'Mestre ID manquant ou invalide.' };
  }
  if (!base64Image) {
    return { success: false, error: 'Image manquante ou invalide.' };
  }

  const id = doc(collection(db, 'mestre_signals')).id;
  const storageRef = ref(storage, `sinais/${mestreId}/${id}`);

  // 1. Upload vers Firebase Storage
  let imageUrl = '';
  try {
    const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    await uploadString(storageRef, base64Image, 'data_url', {
      contentType,
      customMetadata: { mestreId, signalName: name },
    });
    imageUrl = await getDownloadURL(storageRef);
  } catch (storageErr: any) {
    console.error('[CloudSignals] Échec upload Firebase Storage:', storageErr);
    let errorDetail = storageErr?.message || 'Erreur de stockage inconnue';
    if (storageErr?.code === 'storage/unauthorized') {
      errorDetail = 'Permission refusée par les règles Firebase Storage.';
    } else if (storageErr?.code === 'storage/quota-exceeded') {
      errorDetail = 'Quota de stockage Firebase Storage dépassé.';
    } else if (storageErr?.code === 'storage/invalid-format') {
      errorDetail = "Format d'image invalide.";
    }
    return {
      success: false,
      error: `Storage: ${errorDetail}`,
    };
  }

  // 2. Enregistrement dans Firestore
  try {
    const signalData: CloudRhythmSignal = {
      id,
      mestreId,
      name,
      imageUrl,
      createdAt: Date.now(),
    };

    await setDoc(doc(db, 'mestre_signals', id), signalData);
    return { success: true, signal: signalData };
  } catch (firestoreErr: any) {
    console.error('[CloudSignals] Échec enregistrement Firestore:', firestoreErr);
    let errorDetail = firestoreErr?.message || 'Erreur Firestore inconnue';
    if (firestoreErr?.code === 'permission-denied') {
      errorDetail = 'Permission refusée par les règles Firestore.';
    }
    // Nettoyage de l'image orpheline dans Storage
    try {
      await deleteObject(storageRef);
    } catch (_) {}

    return {
      success: false,
      error: `Firestore: ${errorDetail}`,
    };
  }
};

export const deleteMestreSignal = async (
  id: string,
  mestreId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!id || !mestreId) return { success: false, error: 'Identifiants manquants.' };
  try {
    // Suppression Firestore
    await deleteDoc(doc(db, 'mestre_signals', id));

    // Suppression Storage
    try {
      const storageRef = ref(storage, `sinais/${mestreId}/${id}`);
      await deleteObject(storageRef);
    } catch (storageErr: any) {
      console.warn('[CloudSignals] Avertissement suppression Storage:', storageErr);
    }
    return { success: true };
  } catch (err: any) {
    console.error('[CloudSignals] Erreur suppression mestre signal:', err);
    let errorDetail = err?.message || 'Erreur inconnue';
    if (err?.code === 'permission-denied') {
      errorDetail = 'Permission refusée par les règles Firestore.';
    }
    return { success: false, error: errorDetail };
  }
};
