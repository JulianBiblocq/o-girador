/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { BalancoPreset } from '../types/balanco.types';

export const FACTORY_BALANCOS: BalancoPreset[] = [
  {
    id: 'maracatu-trad',
    name: 'Maracatu Nagô',
    ownerId: 'factory',
    authorName: 'O Girador',
    visibility: 'public',
    division: 16,
    offsets: [0, 8, -29, -58],
    isFactory: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'straight',
    name: 'Binaire droit / Quantisé',
    ownerId: 'factory',
    authorName: 'O Girador',
    visibility: 'public',
    division: 16,
    offsets: [0, 0, 0, 0],
    isFactory: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'ijexa-soft',
    name: 'Ijexá Léger',
    ownerId: 'factory',
    authorName: 'O Girador',
    visibility: 'public',
    division: 16,
    offsets: [0, 6, -15, -30],
    isFactory: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  }
];

const LOCAL_STORAGE_KEY = 'girador_user_balancos';

const loadInitialUserPresets = (): BalancoPreset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des balanços locaux:', e);
  }
  return [];
};

const saveUserPresetsToStorage = (presets: BalancoPreset[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des balanços locaux:', e);
  }
};

export interface BalancoStoreState {
  presets: BalancoPreset[];
  userPresets: BalancoPreset[];
  activeEditorPreset: BalancoPreset | null;
  isLoadingCloud: boolean;

  setPresets: (presets: BalancoPreset[]) => void;
  setUserPresets: (userPresets: BalancoPreset[]) => void;
  setActiveEditorPreset: (preset: BalancoPreset | null) => void;
  addLocalPreset: (preset: BalancoPreset) => void;
  updateLocalPreset: (id: string, updates: Partial<BalancoPreset>) => void;
  deleteLocalPreset: (id: string) => Promise<void>;
  syncCloudPresets: (
    userUid: string | null,
    groupId?: string | null,
    role?: string,
    mestreId?: string | null
  ) => Promise<void>;
  resolvePreset: (id?: string) => BalancoPreset;
}

const initialUserPresets = loadInitialUserPresets();

export const useBalancoStore = create<BalancoStoreState>((set, get) => ({
  presets: [...FACTORY_BALANCOS, ...initialUserPresets],
  userPresets: initialUserPresets,
  activeEditorPreset: null,
  isLoadingCloud: false,

  setPresets: (presets) => set({ presets }),

  setUserPresets: (userPresets) => {
    saveUserPresetsToStorage(userPresets);
    set({
      userPresets,
      presets: [...FACTORY_BALANCOS, ...userPresets]
    });
  },

  setActiveEditorPreset: (activeEditorPreset) => set({ activeEditorPreset }),

  addLocalPreset: (preset) => {
    const current = get().userPresets;
    const exists = current.some((p) => p.id === preset.id);
    const nextUserPresets = exists
      ? current.map((p) => (p.id === preset.id ? preset : p))
      : [...current, preset];
    saveUserPresetsToStorage(nextUserPresets);
    set({
      userPresets: nextUserPresets,
      presets: [...FACTORY_BALANCOS, ...nextUserPresets]
    });
  },

  updateLocalPreset: (id, updates) => {
    const nextUserPresets = get().userPresets.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    saveUserPresetsToStorage(nextUserPresets);
    set({
      userPresets: nextUserPresets,
      presets: [...FACTORY_BALANCOS, ...nextUserPresets]
    });
  },

  deleteLocalPreset: async (id) => {
    const nextUserPresets = get().userPresets.filter((p) => p.id !== id);
    saveUserPresetsToStorage(nextUserPresets);
    set({
      userPresets: nextUserPresets,
      presets: [...FACTORY_BALANCOS, ...nextUserPresets]
    });

    // Si le preset est synchronisé sur Firestore, le supprimer également du Cloud
    if (!id.startsWith('custom-')) {
      try {
        const { deleteCloudBalanco } = await import('../cloudBalancos');
        await deleteCloudBalanco(id);
      } catch (e) {
        console.warn('Suppression Cloud ignorée ou échouée:', e);
      }
    }
  },

  syncCloudPresets: async (userUid, groupId, role, mestreId) => {
    if (!userUid) return;
    set({ isLoadingCloud: true });
    try {
      const { fetchCloudBalancos } = await import('../cloudBalancos');
      const cloudPresets = await fetchCloudBalancos(userUid, groupId, role, mestreId);
      const localUsers = get().userPresets;

      // Fusion sans doublon : les presets cloud et locaux sont fusionnés par ID
      const mergedMap = new Map<string, BalancoPreset>();
      localUsers.forEach((p) => mergedMap.set(p.id, p));
      cloudPresets.forEach((p) => mergedMap.set(p.id, p));

      const updatedUserPresets = Array.from(mergedMap.values());
      saveUserPresetsToStorage(updatedUserPresets);

      set({
        userPresets: updatedUserPresets,
        presets: [...FACTORY_BALANCOS, ...updatedUserPresets],
        isLoadingCloud: false
      });
    } catch (err) {
      console.warn('Erreur lors de la synchronisation des balanços cloud:', err);
      set({ isLoadingCloud: false });
    }
  },

  resolvePreset: (id?: string): BalancoPreset => {
    if (!id) return FACTORY_BALANCOS[0];
    const { presets } = get();
    const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const needle = clean(id);
    const found = presets.find((p) => p.id === id || clean(p.id) === needle || clean(p.name) === needle);
    return found || FACTORY_BALANCOS[0];
  }
}));
