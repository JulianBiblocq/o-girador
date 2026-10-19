/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O-Girador - Modular Instrument Nomenclature Store
 * Handles dynamic group nomenclature resolution, real-time Firestore sync,
 * and multi-style anticipation (Maracatu, Capoeira, Samba).
 */

import { create } from 'zustand';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  StyleId, 
  MaracatuRoleKey, 
  GroupNomenclatureData 
} from '../types/nomenclature.types';
import { 
  DEFAULT_NOMENCLATURE, 
  normalizeGroupNomenclature, 
  resolveInstrumentLabel 
} from '../constants/nomenclature';

let activeUnsubscribe: Unsubscribe | null = null;

export interface NomenclatureState {
  activeStyle: StyleId;
  currentGroupId: string | null;
  customNomenclature: Partial<Record<MaracatuRoleKey, string>> | null;
  customNomenclatureAbbr: Partial<Record<MaracatuRoleKey, string>> | null;
  isLoading: boolean;
  setActiveStyle: (style: StyleId) => void;
  setCustomNomenclature: (nomenclature: Partial<Record<MaracatuRoleKey, string>> | null) => void;
  syncGroupNomenclature: (groupId: string | null | undefined) => void;
  getInstrumentLabel: (
    target: number | string | { instrumentIdx?: number; customName?: string; id?: any } | null | undefined,
    overrideNomenclature?: Partial<Record<MaracatuRoleKey, string>> | null
  ) => string;
}

export const useNomenclatureStore = create<NomenclatureState>((set, get) => ({
  activeStyle: 'maracatu',
  currentGroupId: null,
  customNomenclature: null,
  customNomenclatureAbbr: null,
  isLoading: false,

  setActiveStyle: (style: StyleId) => {
    set({ activeStyle: style });
    const currentGroupId = get().currentGroupId;
    if (currentGroupId) get().syncGroupNomenclature(currentGroupId);
  },

  setCustomNomenclature: (nomenclature) => {
    set({ customNomenclature: nomenclature });
  },

  syncGroupNomenclature: (groupId: string | null | undefined) => {
    const trimmedId = groupId ? groupId.trim() : null;
    if (!trimmedId) {
      if (activeUnsubscribe) { activeUnsubscribe(); activeUnsubscribe = null; }
      set({ currentGroupId: null, customNomenclature: null, customNomenclatureAbbr: null, isLoading: false });
      return;
    }
    if (activeUnsubscribe && get().currentGroupId === trimmedId) return;
    if (activeUnsubscribe) { activeUnsubscribe(); activeUnsubscribe = null; }

    set({ currentGroupId: trimmedId, isLoading: true });

    try {
      const assocRef = doc(db, 'associations', trimmedId);
      activeUnsubscribe = onSnapshot(
        assocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const rawNomenclature = data?.nomenclature as GroupNomenclatureData | undefined;
            const normalized = normalizeGroupNomenclature(rawNomenclature, get().activeStyle);
            const rawAbbr = (data?.nomenclatureAbbr?.maracatu || data?.nomenclatureAbbr) as Partial<Record<MaracatuRoleKey, string>> | undefined;
            set({ 
              customNomenclature: Object.keys(normalized).length > 0 ? normalized : null, 
              customNomenclatureAbbr: rawAbbr && Object.keys(rawAbbr).length > 0 ? rawAbbr : null,
              isLoading: false 
            });
          } else {
            set({ customNomenclature: null, customNomenclatureAbbr: null, isLoading: false });
          }
        },
        (error) => {
          console.warn('[NomenclatureStore] Erreur écoute nomenclature association :', error);
          set({ customNomenclature: null, customNomenclatureAbbr: null, isLoading: false });
        }
      );
    } catch (e) {
      console.warn('[NomenclatureStore] Exception syncGroupNomenclature :', e);
      set({ customNomenclature: null, customNomenclatureAbbr: null, isLoading: false });
    }
  },

  getInstrumentLabel: (target, overrideNomenclature) => {
    const nomenclatureToUse = overrideNomenclature !== undefined 
      ? overrideNomenclature 
      : get().customNomenclature;
    return resolveInstrumentLabel(target, nomenclatureToUse, get().activeStyle);
  }
}));

/**
 * React hook to get a memoized resolver function for UI components.
 * Automatically triggers component re-render when group nomenclature updates.
 */
export function useInstrumentLabel() {
  const customNomenclature = useNomenclatureStore((s) => s.customNomenclature);
  const activeStyle = useNomenclatureStore((s) => s.activeStyle);

  return (target: number | string | { instrumentIdx?: number; customName?: string; id?: any } | null | undefined) => {
    return resolveInstrumentLabel(target, customNomenclature, activeStyle);
  };
}

/**
 * Hook to access the raw nomenclature dictionary for the active group
 */
export function useNomenclature() {
  return useNomenclatureStore((s) => s.customNomenclature);
}
