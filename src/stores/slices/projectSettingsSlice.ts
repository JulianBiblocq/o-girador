import { StateCreator } from 'zustand';
import * as Tone from 'tone';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { ProjectSettingsSlice } from './projectSettingsSliceTypes';
import { detectEcoMode } from '../helpers/ecoModeDetector';
import { transposePatternNotesState, extractLyricsFromTracks } from '../helpers/patternTransposeHelper';
import { Language } from '../../types';
import { getInitialMobileViewMode, persistMobileViewMode, MOBILE_VIEW_MODE_STORAGE_KEY } from '../../utils/viewModeResolver';

export const createProjectSettingsSlice: StateCreator<SequencerStore, [], [], ProjectSettingsSlice> = (set, get) => {
  const initialMobileMode = getInitialMobileViewMode();
  return {
  letras: '',
  metadata: { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] },
  isLeftHanded: false, 
  lang: (typeof window !== 'undefined' && (localStorage.getItem('o_girador_lang') as Language)) || 'pt',
  isEcoMode: detectEcoMode(),
  ecoConfig: {
    disableFx: detectEcoMode(),
    disableEq: detectEcoMode(),
    disableAnimations: detectEcoMode()
  },
  editingTrackId: null,
  selectedPatternId: null,
  selectedStepIdx: null,
  selectedStepIsPreRoll: false,
  selectedSubIndex: null,
  selectedStepRange: null,
  vocalTransposeSteps: 0,
  isTracksCollapsed: true,
  isPreviewMode: false,
  hasFullPlaybackAccess: false,
  isVisitorAuthModalOpen: false,
  isSubscriptionModalOpen: false,
  isMobileStudioMode: initialMobileMode === 'complet',
  mobileViewMode: initialMobileMode,
  isTouchLocked: false,

  setLetras: (letras) => set({ letras }),
  setMetadata: (metadata) => set({ metadata }),
  setIsLeftHanded: (val) => set({ isLeftHanded: val }),
  setLang: (lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('o_girador_lang', lang);
    }
    set({ lang });
  },
  toggleEcoMode: () => set((state) => {
    const next = !state.isEcoMode;
    localStorage.setItem('o-girador-eco-mode', String(next));
    return { 
      isEcoMode: next,
      ecoConfig: {
        disableFx: next,
        disableEq: next,
        disableAnimations: next
      }
    };
  }),
  toggleTracksCollapsed: () => set((state) => ({ isTracksCollapsed: !state.isTracksCollapsed })),
  toggleEcoOption: (key) => set((state) => {
    const nextConfig = {
      ...state.ecoConfig,
      [key]: !state.ecoConfig[key]
    };
    const allTrue = nextConfig.disableFx && nextConfig.disableEq && nextConfig.disableAnimations;
    const allFalse = !nextConfig.disableFx && !nextConfig.disableEq && !nextConfig.disableAnimations;
    const nextEcoMode = allTrue ? true : (allFalse ? false : state.isEcoMode);
    localStorage.setItem('o-girador-eco-mode', String(nextEcoMode));
    return { ecoConfig: nextConfig, isEcoMode: nextEcoMode };
  }),
  setEditingTrackId: (id) => set({ editingTrackId: id }),
  closeDetailEditor: () => set({ editingTrackId: null }),
  setSelectedStepIdx: (idx, isPreRoll = false, subIndex = null) => set({ selectedStepIdx: idx, selectedStepIsPreRoll: isPreRoll, selectedSubIndex: subIndex, selectedStepRange: null }),
  setSelectedStepIndex: (idx, isPreRoll = false) => set({ selectedStepIdx: idx, selectedStepIsPreRoll: isPreRoll, selectedSubIndex: null, selectedStepRange: null }),
  setSelectedStepRange: (range) => set({ selectedStepRange: range }),
  setVocalTransposeSteps: (steps) => set({ vocalTransposeSteps: Math.max(-12, Math.min(12, steps)) }),
  incrementVocalTransposeSteps: () => set((state) => ({ vocalTransposeSteps: Math.min(12, state.vocalTransposeSteps + 1) })),
  decrementVocalTransposeSteps: () => set((state) => ({ vocalTransposeSteps: Math.max(-12, state.vocalTransposeSteps - 1) })),
  transposePatternNotes: (trackId, patternId, semitones) => {
    if (!semitones) return;
    const state = get();
    state.pushUndoState();
    try {
      if (typeof window !== 'undefined' && Tone.context && Tone.context.state !== 'running') {
        Tone.start().catch(() => {});
      }
    } catch (_) {}

    const { tracks: newTracks, noteToPreview } = transposePatternNotesState(state.tracks, trackId, patternId, semitones);
    const currentSteps = state.vocalTransposeSteps || 0;
    const nextSteps = currentSteps + semitones;

    set({
      tracks: newTracks,
      tracksVersion: (state.tracksVersion || 0) + 1,
      vocalTransposeSteps: nextSteps,
    });

    if (noteToPreview && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audio-preview-voice-note', { detail: noteToPreview }));
    }
  },
  handleExtractLyrics: () => {
    const letras = extractLyricsFromTracks(get().tracks);
    set({ letras });
  },
  setIsPreviewMode: (val) => set({ isPreviewMode: val }),
  setHasFullPlaybackAccess: (val) => set({ hasFullPlaybackAccess: val }),
  openVisitorAuthModal: () => set({ isVisitorAuthModalOpen: true }),
  closeVisitorAuthModal: () => set({ isVisitorAuthModalOpen: false }),
  openSubscriptionModal: () => set({ isSubscriptionModalOpen: true }),
  closeSubscriptionModal: () => set({ isSubscriptionModalOpen: false }),
  setIsMobileStudioMode: (val) => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY) : null;
    const fallback = (saved === 'percussion' || saved === 'danse') ? (saved as any) : 'percussion';
    const mode = val ? 'complet' : fallback;
    persistMobileViewMode(mode);
    set({ isMobileStudioMode: val, mobileViewMode: mode, isTracksCollapsed: true });
  },
  toggleMobileStudioMode: () => set((state) => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY) : null;
    const fallback = (saved === 'percussion' || saved === 'danse') ? (saved as any) : 'percussion';
    const mode = !state.isMobileStudioMode ? 'complet' : fallback;
    persistMobileViewMode(mode);
    return { isMobileStudioMode: !state.isMobileStudioMode, mobileViewMode: mode, isTracksCollapsed: true };
  }),
  setMobileViewMode: (mode) => {
    persistMobileViewMode(mode);
    set({ mobileViewMode: mode, isMobileStudioMode: mode === 'complet', isTracksCollapsed: true });
  },
  setIsTouchLocked: (val) => set({ isTouchLocked: val }),
  toggleTouchLock: () => set((state) => ({ isTouchLocked: !state.isTouchLocked }))
  };
};
