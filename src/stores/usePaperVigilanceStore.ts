/**
 * Store Zustand pour la gestion cloisonnée des Points de Vigilance (< 135 lignes).
 */
import { create } from 'zustand';

export interface VigilancePoint {
  id: string;
  scoreId: string;
  sectionName: string;
  roleKey: string;
  stepIndex: number;
  trackId?: number;
  patternId?: number;
  reason?: 'ocr_doubt' | 'manual' | 'section_doubt';
  isInjected?: boolean;
}

interface PaperVigilanceState {
  points: VigilancePoint[];
  activeFocusPoint: VigilancePoint | null;
  activePreviewScoreId: string | null;
  activeSequencerScoreId: string | null;
  setActivePreviewScoreId: (scoreId: string | null) => void;
  setActiveSequencerScoreId: (scoreId: string | null) => void;
  addPoint: (pt: Omit<VigilancePoint, 'id'>) => void;
  registerOcrDoubtsForScore: (scoreId: string, doubts: Omit<VigilancePoint, 'id' | 'scoreId'>[]) => void;
  clearDoubtsForSection: (scoreId: string, sectionName: string) => void;
  registerSectionDoubts: (scoreId: string, sectionName: string, doubts: Omit<VigilancePoint, 'id' | 'scoreId'>[]) => void;
  registerSequenceDoubts: (scoreId: string, doubts: Omit<VigilancePoint, 'id' | 'scoreId'>[]) => void;
  clearSequenceDoubts: (scoreId: string) => void;
  togglePoint: (scoreId: string, sectionName: string, roleKey: string, stepIndex: number, reason?: 'ocr_doubt' | 'manual' | 'section_doubt') => void;
  hasPoint: (scoreId: string, sectionName: string, roleKey: string, stepIndex: number) => boolean;
  getPoint: (scoreId: string, sectionName: string, roleKey: string, stepIndex: number) => VigilancePoint | undefined;
  linkPointsToTrack: (scoreId: string, sectionName: string, roleKey: string, trackId: number, patternId: number) => void;
  renameSection: (scoreId: string, oldSecName: string, newSecName: string) => void;
  removePoint: (id: string) => void;
  clearAllForScore: (scoreId: string) => void;
  clearActiveSequencerDoubts: () => void;
  clearAll: () => void;
  setActiveFocusPoint: (pt: VigilancePoint | null) => void;
  getPreviewDoubtsForScore: (scoreId: string) => VigilancePoint[];
  getActiveSequencerDoubts: () => VigilancePoint[];
}

export const usePaperVigilanceStore = create<PaperVigilanceState>((set, get) => ({
  points: [],
  activeFocusPoint: null,
  activePreviewScoreId: null,
  activeSequencerScoreId: null,

  setActivePreviewScoreId: (scoreId) => set({ activePreviewScoreId: scoreId }),
  setActiveSequencerScoreId: (scoreId) => set({ activeSequencerScoreId: scoreId }),

  addPoint: (pt) => {
    const id = `${pt.scoreId}__${pt.sectionName}__${pt.roleKey}__${pt.stepIndex}`;
    if (!get().points.some((p) => p.id === id)) set({ points: [...get().points, { ...pt, id }] });
  },

  registerOcrDoubtsForScore: (scoreId, doubts) => {
    const filtered = get().points.filter((p) => !(p.scoreId === scoreId && p.reason === 'ocr_doubt'));
    const newDoubts = doubts.map((d) => ({ ...d, scoreId, id: `${scoreId}__${d.sectionName}__${d.roleKey}__${d.stepIndex}`, reason: 'ocr_doubt' as const }));
    set({ points: [...filtered, ...newDoubts] });
  },

  clearDoubtsForSection: (scoreId, sectionName) => {
    const norm = sectionName.toLowerCase();
    set({ points: get().points.filter((p) => !(p.scoreId === scoreId && p.sectionName.toLowerCase() === norm && p.reason === 'ocr_doubt')) });
  },

  registerSectionDoubts: (scoreId, sectionName, doubts) => {
    const norm = sectionName.toLowerCase();
    const filtered = get().points.filter((p) => !(p.scoreId === scoreId && p.sectionName.toLowerCase() === norm && p.reason === 'ocr_doubt'));
    const newDoubts = doubts.map((d) => ({ ...d, scoreId, id: `${scoreId}__${d.sectionName}__${d.roleKey}__${d.stepIndex}`, reason: 'ocr_doubt' as const }));
    set({ points: [...filtered, ...newDoubts] });
  },

  registerSequenceDoubts: (scoreId, doubts) => {
    const filtered = get().points.filter((p) => !(p.scoreId === scoreId && p.roleKey === 'sequence'));
    const newDoubts = doubts.map((d) => ({
      ...d, scoreId, id: `${scoreId}__${d.sectionName}__sequence__${d.stepIndex}`, reason: 'section_doubt' as const, roleKey: 'sequence',
    }));
    set({ points: [...filtered, ...newDoubts] });
  },

  clearSequenceDoubts: (scoreId) => {
    set({ points: get().points.filter((p) => !(p.scoreId === scoreId && p.roleKey === 'sequence')) });
  },

  togglePoint: (scoreId, sectionName, roleKey, stepIndex, reason = 'manual') => {
    const id = `${scoreId}__${sectionName}__${roleKey}__${stepIndex}`;
    const exists = get().points.some((p) => p.id === id);
    if (exists) {
      set({ points: get().points.filter((p) => p.id !== id), activeFocusPoint: get().activeFocusPoint?.id === id ? null : get().activeFocusPoint });
    } else {
      set({ points: [...get().points, { id, scoreId, sectionName, roleKey, stepIndex, reason }] });
    }
  },

  hasPoint: (scoreId, sectionName, roleKey, stepIndex) => get().points.some((p) => p.id === `${scoreId}__${sectionName}__${roleKey}__${stepIndex}`),
  getPoint: (scoreId, sectionName, roleKey, stepIndex) => get().points.find((p) => p.id === `${scoreId}__${sectionName}__${roleKey}__${stepIndex}`),

  linkPointsToTrack: (scoreId, sectionName, roleKey, trackId, patternId) => {
    const normSec = sectionName.toLowerCase(), normRole = roleKey.toLowerCase();
    set({
      points: get().points.map((p) => p.scoreId === scoreId && p.sectionName.toLowerCase() === normSec && p.roleKey.toLowerCase() === normRole
        ? { ...p, trackId, patternId, isInjected: true } : p),
    });
  },

  renameSection: (scoreId, oldSecName, newSecName) => {
    const normOld = oldSecName.toLowerCase();
    set({
      points: get().points.map((p) => p.scoreId === scoreId && p.sectionName.toLowerCase() === normOld
        ? { ...p, sectionName: newSecName, id: `${scoreId}__${newSecName}__${p.roleKey}__${p.stepIndex}` } : p),
    });
  },

  removePoint: (id) => set({ points: get().points.filter((p) => p.id !== id), activeFocusPoint: get().activeFocusPoint?.id === id ? null : get().activeFocusPoint }),
  clearAllForScore: (scoreId) => set({ points: get().points.filter((p) => p.scoreId !== scoreId), activeFocusPoint: get().activeFocusPoint?.scoreId === scoreId ? null : get().activeFocusPoint }),
  clearActiveSequencerDoubts: () => {
    const activeId = get().activeSequencerScoreId;
    if (activeId) set({ points: get().points.filter((p) => p.scoreId !== activeId), activeFocusPoint: get().activeFocusPoint?.scoreId === activeId ? null : get().activeFocusPoint });
  },
  clearAll: () => set({ points: [], activeFocusPoint: null }),
  setActiveFocusPoint: (pt) => set({ activeFocusPoint: pt }),
  getPreviewDoubtsForScore: (scoreId) => get().points.filter((p) => p.scoreId === scoreId),
  getActiveSequencerDoubts: () => {
    const activeId = get().activeSequencerScoreId;
    return !activeId ? [] : get().points.filter((p) => p.scoreId === activeId && p.trackId !== undefined && p.patternId !== undefined);
  },
}));
