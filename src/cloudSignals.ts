import { collection, doc, setDoc, updateDoc, getDocs, deleteDoc, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase/config';
import { CloudRhythmSignal } from './types';
import type { CordelOptions } from './utils/cordelEffect';

export const fetchMestreSignals = async (mestreId: string, lastVisibleDoc?: any): Promise<{ signals: CloudRhythmSignal[], lastDoc: any }> => {
  if (!mestreId) return { signals: [], lastDoc: null };
  try {
    const mestreIdsToFetch = mestreId === 'global' ? ['global'] : ['global', mestreId];
    // 🛡️ Pagination support with startAfter
    let q = query(collection(db, 'mestre_signals'), where('mestreId', 'in', mestreIdsToFetch), orderBy('createdAt', 'desc'));
    if (lastVisibleDoc) {
      q = query(q, startAfter(lastVisibleDoc));
    }
    const querySnapshot = await getDocs(query(q, limit(50)));
    const signals: CloudRhythmSignal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as CloudRhythmSignal;
      // 🛡️ Priorité absolue aux trames Base64 pour contourner les erreurs HTTP 402 de Storage
      const resolvedImage = (data.frames && data.frames[0] && data.frames[0].startsWith('data:'))
        ? data.frames[0]
        : (data.image && data.image.startsWith('data:'))
          ? data.image
          : (data.imageUrl && data.imageUrl.startsWith('data:'))
            ? data.imageUrl
            : (data.imageUrl || data.image || '');

      signals.push({
        ...data,
        image: resolvedImage,
      });
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
  base64Image: string,
  frames?: string[],
  beatsCount?: number,
  mirrorHorizontal?: boolean,
  rawFrames?: string[],
  cordelOptions?: CordelOptions
): Promise<UploadSignalResult> => {
  if (!mestreId) {
    return { success: false, error: 'Mestre ID manquant ou invalide.' };
  }
  if (!base64Image) {
    return { success: false, error: 'Image manquante ou invalide.' };
  }

  const id = doc(collection(db, 'mestre_signals')).id;
  const storageRef = ref(storage, `sinais/${mestreId}/${id}`);

  // 1. Upload vers Firebase Storage (optionnel et tolérant aux erreurs 402)
  let imageUrl = base64Image;
  try {
    const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    await uploadString(storageRef, base64Image, 'data_url', {
      contentType,
      customMetadata: { mestreId, signalName: name },
    });
    imageUrl = await getDownloadURL(storageRef);
  } catch (storageErr: any) {
    // 🛡️ Si Firebase Storage est bloqué en 402 (Payment Required), repli direct sur Base64 dans Firestore
    console.warn('[CloudSignals] Firebase Storage inaccessible ou restreint, stockage direct Base64 Firestore:', storageErr?.message);
    imageUrl = base64Image;
  }

  // 2. Enregistrement direct et pérenne dans Firestore
  try {
    const finalFrames = frames && frames.length > 0 ? frames : [base64Image];
    const signalData: CloudRhythmSignal = {
      id,
      mestreId,
      name,
      image: base64Image,
      imageUrl,
      createdAt: Date.now(),
      frames: finalFrames,
      rawFrames: rawFrames && rawFrames.length > 0 ? rawFrames : undefined,
      cordelOptions: cordelOptions || undefined,
      beatsCount: beatsCount || finalFrames.length,
      mirrorHorizontal: mirrorHorizontal ?? false,
    };

    await setDoc(doc(db, 'mestre_signals', id), signalData);
    return { success: true, signal: signalData };
  } catch (firestoreErr: any) {
    console.error('[CloudSignals] Échec enregistrement Firestore:', firestoreErr);
    let errorDetail = firestoreErr?.message || 'Erreur Firestore inconnue';
    if (firestoreErr?.code === 'permission-denied') {
      errorDetail = 'Permission refusée par les règles Firestore.';
    }
    return {
      success: false,
      error: `Firestore: ${errorDetail}`,
    };
  }
};

export const updateMestreSignal = async (
  id: string,
  updates: {
    name?: string;
    image?: string;
    imageUrl?: string;
    frames?: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    beatsCount?: number;
    mirrorHorizontal?: boolean;
  }
): Promise<{ success: boolean; error?: string }> => {
  if (!id) return { success: false, error: 'ID manquant.' };
  try {
    const payload: any = {
      updatedAt: Date.now(),
    };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl;
    if (updates.frames !== undefined) payload.frames = updates.frames;
    if (updates.rawFrames !== undefined) payload.rawFrames = updates.rawFrames;
    if (updates.cordelOptions !== undefined) payload.cordelOptions = updates.cordelOptions;
    if (updates.beatsCount !== undefined) payload.beatsCount = updates.beatsCount;
    if (updates.mirrorHorizontal !== undefined) payload.mirrorHorizontal = updates.mirrorHorizontal;

    await updateDoc(doc(db, 'mestre_signals', id), payload);
    return { success: true };
  } catch (err: any) {
    console.error('[CloudSignals] Erreur mise à jour mestre signal:', err);
    return { success: false, error: err?.message || 'Erreur Firestore' };
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
