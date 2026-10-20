/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { CloudRhythmSignal } from '../../types';
import type { CordelOptions } from '../../utils/cordelEffect';

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
  cordelOptions?: CordelOptions,
  frameOverrides?: Record<number, Partial<CordelOptions>>
): Promise<UploadSignalResult> => {
  if (!mestreId) return { success: false, error: 'Mestre ID manquant ou invalide.' };
  if (!base64Image) return { success: false, error: 'Image manquante ou invalide.' };

  const id = doc(collection(db, 'mestre_signals')).id;
  const storageRef = ref(storage, `sinais/${mestreId}/${id}`);
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
    console.warn('[CloudSignals] Firebase Storage inaccessible, stockage direct Base64 Firestore:', storageErr?.message);
    imageUrl = base64Image;
  }

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
      frameOverrides: frameOverrides && Object.keys(frameOverrides).length > 0 ? frameOverrides : undefined,
      beatsCount: beatsCount || finalFrames.length,
      mirrorHorizontal: mirrorHorizontal ?? false,
    };

    await setDoc(doc(db, 'mestre_signals', id), signalData);
    return { success: true, signal: signalData };
  } catch (firestoreErr: any) {
    console.error('[CloudSignals] Échec enregistrement Firestore:', firestoreErr);
    const errorDetail = firestoreErr?.code === 'permission-denied'
      ? 'Permission refusée par les règles Firestore.'
      : (firestoreErr?.message || 'Erreur Firestore inconnue');
    return { success: false, error: `Firestore: ${errorDetail}` };
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
    frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount?: number;
    mirrorHorizontal?: boolean;
  }
): Promise<{ success: boolean; error?: string }> => {
  if (!id) return { success: false, error: 'ID manquant.' };
  try {
    const payload: any = { updatedAt: Date.now() };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.image !== undefined) payload.image = updates.image;
    if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl;
    if (updates.frames !== undefined) payload.frames = updates.frames;
    if (updates.rawFrames !== undefined) payload.rawFrames = updates.rawFrames;
    if (updates.cordelOptions !== undefined) payload.cordelOptions = updates.cordelOptions;
    if (updates.frameOverrides !== undefined) payload.frameOverrides = updates.frameOverrides;
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
    await deleteDoc(doc(db, 'mestre_signals', id));
    try {
      await deleteObject(ref(storage, `sinais/${mestreId}/${id}`));
    } catch (storageErr: any) {
      console.warn('[CloudSignals] Avertissement suppression Storage:', storageErr);
    }
    return { success: true };
  } catch (err: any) {
    console.error('[CloudSignals] Erreur suppression mestre signal:', err);
    const errorDetail = err?.code === 'permission-denied'
      ? 'Permission refusée par les règles Firestore.'
      : (err?.message || 'Erreur inconnue');
    return { success: false, error: errorDetail };
  }
};
