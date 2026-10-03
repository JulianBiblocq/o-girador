/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { TrainingProgram } from '../types/trainings';

export const CLOUD_TRAININGS_COLLECTION = 'trainings';

/**
 * Enregistre un nouveau programme d'entraînement Mestre dans Firestore (/trainings).
 * Le groupId est toujours normalisé en minuscules.
 */
export async function saveTrainingProgram(training: Omit<TrainingProgram, 'id'>): Promise<string> {
  const normalizedGroupId = (training.groupId || '').trim().toLowerCase();
  
  const payload = {
    ...training,
    groupId: normalizedGroupId,
    createdAt: training.createdAt || Date.now(),
  };

  const collRef = collection(db, CLOUD_TRAININGS_COLLECTION);
  const docRef = await addDoc(collRef, payload);
  return docRef.id;
}

/**
 * Met à jour un programme d'entraînement existant (/trainings/{trainingId}).
 */
export async function updateTrainingProgram(
  trainingId: string,
  data: Partial<Omit<TrainingProgram, 'id'>>
): Promise<void> {
  if (!trainingId) throw new Error('Training ID is required for update');
  const docRef = doc(db, CLOUD_TRAININGS_COLLECTION, trainingId);
  const payload: Record<string, any> = {
    ...data,
    updatedAt: Date.now(),
  };
  if (payload.groupId) {
    payload.groupId = payload.groupId.trim().toLowerCase();
  }
  await updateDoc(docRef, payload);
}

/**
 * Supprime un programme d'entraînement (/trainings/{trainingId}).
 */
export async function deleteTrainingProgram(trainingId: string): Promise<void> {
  if (!trainingId) throw new Error('Training ID is required for deletion');
  const docRef = doc(db, CLOUD_TRAININGS_COLLECTION, trainingId);
  await deleteDoc(docRef);
}

/**
 * Récupère les entraînements existants rattachés à un morceau et un groupe.
 * Tolérance de casse sur le groupId ([groupId, groupId.toLowerCase()]).
 * Garde-fou strict : si presetId ou groupId est vide/falsy, retourne immédiatement [] sans requête.
 */
export async function fetchTrainingsByPreset(presetId?: string | null, groupId?: string | null): Promise<TrainingProgram[]> {
  const cleanPreset = (presetId || '').trim();
  const cleanGroup = (groupId || '').trim();
  if (!cleanPreset || !cleanGroup) return [];

  const collRef = collection(db, CLOUD_TRAININGS_COLLECTION);

  try {
    const groupVariants = Array.from(new Set([cleanGroup, cleanGroup.toLowerCase()].filter(Boolean)));

    let q;
    if (groupVariants.length > 1) {
      q = query(
        collRef,
        where('presetId', '==', cleanPreset),
        where('groupId', 'in', groupVariants)
      );
    } else {
      q = query(
        collRef,
        where('presetId', '==', cleanPreset),
        where('groupId', '==', groupVariants[0])
      );
    }

    const snap = await getDocs(q);
    const results: TrainingProgram[] = [];
    snap.forEach((doc) => {
      results.push({ id: doc.id, ...(doc.data() as Omit<TrainingProgram, 'id'>) });
    });

    // Tri décroissant client-side par date de création
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return results;
  } catch (error) {
    console.error('Error fetching trainings by preset:', error);
    return [];
  }
}

/**
 * Récupère un programme d'entraînement par son identifiant unique.
 */
export async function getTrainingById(trainingId: string): Promise<TrainingProgram | null> {
  if (!trainingId) return null;
  try {
    const docRef = doc(db, CLOUD_TRAININGS_COLLECTION, trainingId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<TrainingProgram, 'id'>) };
  } catch (error) {
    console.error('Error fetching training by id:', error);
    return null;
  }
}

/**
 * Enregistre la validation d'un palier d'entraînement dans le profil élève (/users/{uid}/aisance/{trainingId}).
 */
export async function recordStageSuccess(uid: string, trainingId: string, stageIndex: number): Promise<void> {
  if (!uid || !trainingId) return;
  try {
    const aisanceDocRef = doc(db, 'users', uid, 'aisance', trainingId);
    await setDoc(
      aisanceDocRef,
      {
        trainingId,
        lastCompletedStage: stageIndex,
        completedStages: {
          [stageIndex]: {
            completedAt: Date.now(),
            success: true,
          },
        },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    console.log(`[Aisance] Succès enregistré pour élève ${uid}, training ${trainingId}, palier ${stageIndex}`);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du succès du palier:', error);
  }
}

