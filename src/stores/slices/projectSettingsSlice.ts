import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { ProjectSettingsSlice } from './projectSettingsSliceTypes';
import { detectEcoMode, detectStrictAudioEco, buildEcoConfig, persistEcoState } from '../helpers/ecoModeDetector';
import { extractLyricsFromTracks } from '../helpers/patternTransposeHelper';
import { applyVocalTransposeStepsState, applyTransposePatternNotesState } from '../helpers/projectVocalTransposeHelper';
import { Language } from '../../types';
import { getInitialMobileViewMode, persistMobileViewMode, MOBILE_VIEW_MODE_STORAGE_KEY } from '../../utils/viewModeResolver';
import { getStoredLeftHanded, setStoredLeftHanded } from '../../utils/userPreferencesStorage';

export const createProjectSettingsSlice: StateCreator<SequencerStore, [], [], ProjectSettingsSlice> = (set, get) => {
  const initialMobileMode = getInitialMobileViewMode();
  const initialEco = detectEcoMode();
  const initialSweepMode =
    typeof window !== 'undefined' && localStorage.getItem('o_girador_roda_sweep_mode') === 'fullMeasure'
      ? 'fullMeasure'
      : 'sweep6h';

  return {
    letras: '',
    metadata: { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] },
    isLeftHanded: getStoredLeftHanded(),
    lang: (typeof window !== 'undefined' && (localStorage.getItem('o_girador_lang') as Language)) || 'pt',
    isEcoMode: initialEco,
    ecoConfig: buildEcoConfig(initialEco, detectStrictAudioEco(initialEco)),
    rodaSweepMode: initialSweepMode,
    editingTrackId: null,
    selectedPatternId: null,
    selectedStepIdx: null,
    selectedStepIsPreRoll: false,
    selectedSubIndex: null,
    selectedStepRange: null,
    editorDeepLink: null,
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
    setIsLeftHanded: (val) => {
      setStoredLeftHanded(val);
      set({ isLeftHanded: val });
    },
    setLang: (lang) => {
      if (typeof window !== 'undefined') localStorage.setItem('o_girador_lang', lang);
      set({ lang });
    },
    setRodaSweepMode: (mode) => {
      if (typeof window !== 'undefined') localStorage.setItem('o_girador_roda_sweep_mode', mode);
      set({ rodaSweepMode: mode });
    },
    toggleRodaSweepMode: () =>
      set((state) => {
        const next = state.rodaSweepMode === 'sweep6h' ? 'fullMeasure' : 'sweep6h';
        if (typeof window !== 'undefined') localStorage.setItem('o_girador_roda_sweep_mode', next);
        return { rodaSweepMode: next };
      }),
    toggleEcoMode: () =>
      set((state) => {
        const next = !state.isEcoMode;
        persistEcoState(next, false);
        return { isEcoMode: next, ecoConfig: buildEcoConfig(next, false) };
      }),
    toggleStrictAudioEco: () =>
      set((state) => {
        const nextStrict = !(state.isEcoMode && Boolean(state.ecoConfig?.disableFx) && Boolean(state.ecoConfig?.disableEq));
        const nextEco = state.isEcoMode || nextStrict;
        persistEcoState(nextEco, nextStrict);
        return { isEcoMode: nextEco, ecoConfig: buildEcoConfig(nextEco, nextStrict) };
      }),
    toggleTracksCollapsed: () => set((state) => ({ isTracksCollapsed: !state.isTracksCollapsed })),
    setEditingTrackId: (id) => set({ editingTrackId: id }),
    openInstrumentDetailAt: (payload) =>
      set({
        editingTrackId: payload.trackId,
        selectedPatternId: typeof payload.patternId === 'number' ? payload.patternId : null,
        selectedStepIdx: payload.stepIdx !== undefined ? payload.stepIdx : null,
        selectedStepIsPreRoll: Boolean(payload.isPreRoll),
        selectedSubIndex: payload.subIndex ?? null,
        selectedStepRange: null,
        editorDeepLink: payload,
      }),
    consumeEditorDeepLink: () => set({ editorDeepLink: null }),
    closeDetailEditor: () => set({ editingTrackId: null, editorDeepLink: null }),
    setSelectedStepIdx: (idx, isPreRoll = false, subIndex = null) =>
      set({ selectedStepIdx: idx, selectedStepIsPreRoll: isPreRoll, selectedSubIndex: subIndex, selectedStepRange: null }),
    setSelectedStepIndex: (idx, isPreRoll = false) =>
      set({ selectedStepIdx: idx, selectedStepIsPreRoll: isPreRoll, selectedSubIndex: null, selectedStepRange: null }),
    setSelectedStepRange: (range) => set({ selectedStepRange: range }),
    setVocalTransposeSteps: (steps) => applyVocalTransposeStepsState(steps, set, get),
    incrementVocalTransposeSteps: () => get().setVocalTransposeSteps(Math.min(12, (get().vocalTransposeSteps ?? 0) + 1)),
    decrementVocalTransposeSteps: () => get().setVocalTransposeSteps(Math.max(-12, (get().vocalTransposeSteps ?? 0) - 1)),
    transposePatternNotes: (trackId, patternId, semitones) =>
      applyTransposePatternNotesState(trackId, patternId, semitones, set, get),
    handleExtractLyrics: () => set({ letras: extractLyricsFromTracks(get().tracks) }),
    setIsPreviewMode: (val) => set({ isPreviewMode: val }),
    setHasFullPlaybackAccess: (val) => set({ hasFullPlaybackAccess: val }),
    openVisitorAuthModal: () => set({ isVisitorAuthModalOpen: true }),
    closeVisitorAuthModal: () => set({ isVisitorAuthModalOpen: false }),
    openSubscriptionModal: () => set({ isSubscriptionModalOpen: true }),
    closeSubscriptionModal: () => set({ isSubscriptionModalOpen: false }),
    setIsMobileStudioMode: (val) => {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY) : null;
      const mode = val ? 'complet' : (saved === 'percussion' || saved === 'danse' ? (saved as any) : 'percussion');
      persistMobileViewMode(mode);
      set({ isMobileStudioMode: val, mobileViewMode: mode, isTracksCollapsed: true });
    },
    toggleMobileStudioMode: () =>
      set((state) => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(MOBILE_VIEW_MODE_STORAGE_KEY) : null;
        const mode = !state.isMobileStudioMode ? 'complet' : (saved === 'percussion' || saved === 'danse' ? (saved as any) : 'percussion');
        persistMobileViewMode(mode);
        return { isMobileStudioMode: !state.isMobileStudioMode, mobileViewMode: mode, isTracksCollapsed: true };
      }),
    setMobileViewMode: (mode) => {
      persistMobileViewMode(mode);
      set({ mobileViewMode: mode, isMobileStudioMode: mode === 'complet', isTracksCollapsed: true });
    },
    setIsTouchLocked: (val) => set({ isTouchLocked: val }),
    toggleTouchLock: () => set((state) => ({ isTouchLocked: !state.isTouchLocked })),
  };
};
