/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
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
 * Récupère les entraînements existants rattachés à un morceau et un groupe.
 * Tolérance de casse sur le groupId ([groupId, groupId.toLowerCase()]).
 */
export async function fetchTrainingsByPreset(presetId: string, groupId: string): Promise<TrainingProgram[]> {
  if (!presetId) return [];
  const collRef = collection(db, CLOUD_TRAININGS_COLLECTION);

  try {
    const rawGroup = (groupId || '').trim();
    const groupVariants = Array.from(new Set([rawGroup, rawGroup.toLowerCase()].filter(Boolean)));

    let q;
    if (groupVariants.length > 1) {
      q = query(
        collRef,
        where('presetId', '==', presetId),
        where('groupId', 'in', groupVariants)
      );
    } else if (groupVariants.length === 1) {
      q = query(
        collRef,
        where('presetId', '==', presetId),
        where('groupId', '==', groupVariants[0])
      );
    } else {
      q = query(
        collRef,
        where('presetId', '==', presetId)
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
