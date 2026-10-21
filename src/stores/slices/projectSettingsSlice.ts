import { StateCreator } from 'zustand';
import * as Tone from 'tone';
import type { SequencerStore } from '../useSequencerStore';
import { ProjectSettingsSlice } from './projectSettingsSliceTypes';
import { detectEcoMode } from '../helpers/ecoModeDetector';
import { transposePatternNotesState, extractLyricsFromTracks } from '../helpers/patternTransposeHelper';
import { Language } from '../../types';

export const createProjectSettingsSlice: StateCreator<SequencerStore, [], [], ProjectSettingsSlice> = (set, get) => ({
  letras: '',
  metadata: { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] },
  isLeftHanded: false, 
  lang: (typeof window !== 'undefined' && (localStorage.getItem('o_girador_lang') as Language)) || 'pt',
  vocalCalibrationLatencyMs: parseInt(localStorage.getItem('oGirador_vocal_calibration_latency') || '0', 10),
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
  isTracksCollapsed: typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768) ? false : true,
  isPreviewMode: false,
  hasFullPlaybackAccess: false,
  isVisitorAuthModalOpen: false,
  isSubscriptionModalOpen: false,
  isMobileStudioMode: false,

  setLetras: (letras) => set({ letras }),
  setMetadata: (metadata) => set({ metadata }),
  setIsLeftHanded: (val) => set({ isLeftHanded: val }),
  setLang: (lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('o_girador_lang', lang);
    }
    set({ lang });
  },
  setVocalCalibrationLatencyMs: (val) => {
    localStorage.setItem('oGirador_vocal_calibration_latency', String(val));
    set({ vocalCalibrationLatencyMs: val });
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
    
    let nextEcoMode = state.isEcoMode;
    if (allTrue) nextEcoMode = true;
    if (allFalse) nextEcoMode = false;
    
    localStorage.setItem('o-girador-eco-mode', String(nextEcoMode));
    
    return {
      ecoConfig: nextConfig,
      isEcoMode: nextEcoMode
    };
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
  setIsMobileStudioMode: (val) => set({ isMobileStudioMode: val }),
  toggleMobileStudioMode: () => set((state) => ({ isMobileStudioMode: !state.isMobileStudioMode }))
});
