/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Store Zustand pour la gestion des Points de Vigilance de l'Atelier Papier (< 90 lignes).
 */
import { create } from 'zustand';

export interface VigilancePoint {
  id: string; // `${sectionName}__${roleKey}__${stepIndex}`
  sectionName: string;
  roleKey: string;
  stepIndex: number;
  trackId?: number;
  patternId?: number;
  reason?: 'ocr_doubt' | 'manual';
}

interface PaperVigilanceState {
  points: VigilancePoint[];
  activeFocusPoint: VigilancePoint | null;
  addPoint: (pt: Omit<VigilancePoint, 'id'>) => void;
  togglePoint: (sectionName: string, roleKey: string, stepIndex: number, reason?: 'ocr_doubt' | 'manual') => void;
  hasPoint: (sectionName: string, roleKey: string, stepIndex: number) => boolean;
  getPoint: (sectionName: string, roleKey: string, stepIndex: number) => VigilancePoint | undefined;
  linkPointsToTrack: (sectionName: string, roleKey: string, trackId: number, patternId: number) => void;
  removePoint: (id: string) => void;
  clearAll: () => void;
  setActiveFocusPoint: (pt: VigilancePoint | null) => void;
}

export const usePaperVigilanceStore = create<PaperVigilanceState>((set, get) => ({
  points: [],
  activeFocusPoint: null,

  addPoint: (pt) => {
    const id = `${pt.sectionName}__${pt.roleKey}__${pt.stepIndex}`;
    if (get().points.some((p) => p.id === id)) return;
    set({ points: [...get().points, { ...pt, id }] });
  },

  togglePoint: (sectionName, roleKey, stepIndex, reason = 'manual') => {
    const id = `${sectionName}__${roleKey}__${stepIndex}`;
    const exists = get().points.some((p) => p.id === id);
    if (exists) {
      set({
        points: get().points.filter((p) => p.id !== id),
        activeFocusPoint: get().activeFocusPoint?.id === id ? null : get().activeFocusPoint,
      });
    } else {
      const newPt: VigilancePoint = { id, sectionName, roleKey, stepIndex, reason };
      set({ points: [...get().points, newPt] });
    }
  },

  hasPoint: (sectionName, roleKey, stepIndex) => {
    const id = `${sectionName}__${roleKey}__${stepIndex}`;
    return get().points.some((p) => p.id === id);
  },

  getPoint: (sectionName, roleKey, stepIndex) => {
    const id = `${sectionName}__${roleKey}__${stepIndex}`;
    return get().points.find((p) => p.id === id);
  },

  linkPointsToTrack: (sectionName, roleKey, trackId, patternId) => {
    const normSec = sectionName.toLowerCase();
    const normRole = roleKey.toLowerCase();
    set({
      points: get().points.map((p) => {
        if (p.sectionName.toLowerCase() === normSec && p.roleKey.toLowerCase() === normRole) {
          return { ...p, trackId, patternId };
        }
        return p;
      }),
    });
  },

  removePoint: (id) => {
    set({
      points: get().points.filter((p) => p.id !== id),
      activeFocusPoint: get().activeFocusPoint?.id === id ? null : get().activeFocusPoint,
    });
  },

  clearAll: () => set({ points: [], activeFocusPoint: null }),

  setActiveFocusPoint: (pt) => set({ activeFocusPoint: pt }),
}));
