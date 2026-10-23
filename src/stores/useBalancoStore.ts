
import { create } from 'zustand';
import { BalancoPreset } from '../types/balanco.types';
import {
  FACTORY_BALANCOS,
  loadInitialUserBalancoPresets,
  saveUserBalancoPresetsToStorage,
} from './helpers/balancoPresetsHelper';

export { FACTORY_BALANCOS };

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
    mestreId?: string | null,
    canWriteSequenciador?: boolean
  ) => Promise<void>;
  resolvePreset: (id?: string) => BalancoPreset;
}

const initialUserPresets = loadInitialUserBalancoPresets();

export const useBalancoStore = create<BalancoStoreState>((set, get) => ({
  presets: [...FACTORY_BALANCOS, ...initialUserPresets],
  userPresets: initialUserPresets,
  activeEditorPreset: null,
  isLoadingCloud: false,

  setPresets: (presets) => set({ presets }),

  setUserPresets: (userPresets) => {
    saveUserBalancoPresetsToStorage(userPresets);
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
    saveUserBalancoPresetsToStorage(nextUserPresets);
    set({
      userPresets: nextUserPresets,
      presets: [...FACTORY_BALANCOS, ...nextUserPresets]
    });
  },

  updateLocalPreset: (id, updates) => {
    const nextUserPresets = get().userPresets.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    saveUserBalancoPresetsToStorage(nextUserPresets);
    set({
      userPresets: nextUserPresets,
      presets: [...FACTORY_BALANCOS, ...nextUserPresets]
    });
  },

  deleteLocalPreset: async (id) => {
    const nextUserPresets = get().userPresets.filter((p) => p.id !== id);
    saveUserBalancoPresetsToStorage(nextUserPresets);
    set({
      userPresets: nextUserPresets,
      presets: [...FACTORY_BALANCOS, ...nextUserPresets]
    });

    if (!id.startsWith('custom-')) {
      try {
        const { deleteCloudBalanco } = await import('../cloudBalancos');
        await deleteCloudBalanco(id);
      } catch (e) {
        console.warn('Suppression Cloud ignorée ou échouée:', e);
      }
    }
  },

  syncCloudPresets: async (userUid, groupId, role, mestreId, canWriteSequenciador) => {
    if (!userUid) return;
    set({ isLoadingCloud: true });
    try {
      const { fetchCloudBalancos } = await import('../cloudBalancos');
      const cloudPresets = await fetchCloudBalancos(userUid, groupId, role, mestreId, canWriteSequenciador);
      const localUsers = get().userPresets;

      const mergedMap = new Map<string, BalancoPreset>();
      localUsers.forEach((p) => mergedMap.set(p.id, p));
      cloudPresets.forEach((p) => mergedMap.set(p.id, p));

      const updatedUserPresets = Array.from(mergedMap.values());
      saveUserBalancoPresetsToStorage(updatedUserPresets);

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
