/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { DispositionPreset } from '../types/disposition.types';

const LOCAL_STORAGE_KEY = 'girador_user_dispositions';

const loadInitialLocalDispositions = (): DispositionPreset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des dispositions locales:', e);
  }
  return [];
};

const saveDispositionsToStorage = (presets: DispositionPreset[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des dispositions locales:', e);
  }
};

export interface DispositionStoreState {
  dispositions: DispositionPreset[];
  isLoadingCloud: boolean;

  setDispositions: (dispositions: DispositionPreset[]) => void;
  addDisposition: (
    disposition: Omit<DispositionPreset, 'id' | 'createdAt' | 'updatedAt'>,
    userRole?: string
  ) => Promise<DispositionPreset>;
  deleteDisposition: (id: string) => Promise<void>;
  syncCloudDispositions: (
    userUid: string | null,
    groupId?: string | null,
    mestreId?: string | null,
    userRole?: string
  ) => Promise<void>;
}

const initialLocalDispositions = loadInitialLocalDispositions();

export const useDispositionStore = create<DispositionStoreState>((set, get) => ({
  dispositions: initialLocalDispositions,
  isLoadingCloud: false,

  setDispositions: (dispositions) => {
    saveDispositionsToStorage(dispositions);
    set({ dispositions });
  },

  addDisposition: async (presetData, userRole) => {
    const now = Date.now();
    const isOfflineOrGuest = !presetData.ownerId || presetData.ownerId === 'local';
    const localId = `disp_local_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const newPreset: DispositionPreset = {
      ...presetData,
      id: localId,
      createdAt: now,
      updatedAt: now
    };

    // 1. Sauvegarde locale immédiate (Local-First)
    const currentList = get().dispositions;
    const updatedLocally = [newPreset, ...currentList.filter((d) => d.id !== localId)];
    saveDispositionsToStorage(updatedLocally);
    set({ dispositions: updatedLocally });

    // 2. Si l'utilisateur est connecté, tentative de synchronisation Cloud asynchrone
    if (!isOfflineOrGuest) {
      try {
        const { saveDispositionToCloud } = await import('../cloudDispositions');
        const cloudId = await saveDispositionToCloud(newPreset, userRole);

        // Mise à jour de l'ID avec l'ID Firestore
        const presetWithCloudId: DispositionPreset = {
          ...newPreset,
          id: cloudId
        };

        const finalizedList = get().dispositions.map((d) =>
          d.id === localId ? presetWithCloudId : d
        );
        saveDispositionsToStorage(finalizedList);
        set({ dispositions: finalizedList });

        return presetWithCloudId;
      } catch (err) {
        console.warn("Synchronisation Cloud échouée (sauvegarde locale conservée):", err);
      }
    }

    return newPreset;
  },

  deleteDisposition: async (id: string) => {
    // 1. Suppression locale immédiate
    const remaining = get().dispositions.filter((d) => d.id !== id);
    saveDispositionsToStorage(remaining);
    set({ dispositions: remaining });

    // 2. Si c'est un document Cloud, suppression dans Firestore
    if (!id.startsWith('local_') && !id.startsWith('disp_local_')) {
      try {
        const { deleteDispositionFromCloud } = await import('../cloudDispositions');
        await deleteDispositionFromCloud(id);
      } catch (err) {
        console.warn("Suppression Cloud de la disposition ignorée ou échouée:", err);
      }
    }
  },

  syncCloudDispositions: async (userUid, groupId, mestreId, userRole) => {
    if (!userUid || userUid === 'local') return;

    set({ isLoadingCloud: true });
    try {
      const { fetchCloudDispositions } = await import('../cloudDispositions');
      const cloudDispositions = await fetchCloudDispositions(userUid, groupId, mestreId, userRole);
      const currentDispositions = get().dispositions;

      // Fusion sans doublon : on fusionne par ID
      const mergedMap = new Map<string, DispositionPreset>();

      // On place d'abord les locales
      currentDispositions.forEach((d) => mergedMap.set(d.id, d));
      // Puis les cloud écrasent ou complètent
      cloudDispositions.forEach((d) => mergedMap.set(d.id, d));

      const mergedList = Array.from(mergedMap.values());
      // Tri par date de création décroissante
      mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      saveDispositionsToStorage(mergedList);
      set({
        dispositions: mergedList,
        isLoadingCloud: false
      });
    } catch (err) {
      console.warn("Erreur lors de la synchronisation des dispositions cloud:", err);
      set({ isLoadingCloud: false });
    }
  }
}));
