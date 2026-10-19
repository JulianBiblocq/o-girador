import { create, StateCreator } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import * as Tone from 'tone';
import { TrackGroup, TimeSignature, SongSection, Pattern, PresetMetadata, Language, SongMarker, MasterFX, CloudRhythmSignal, StepSculptValue, SpeedTrainerSlice, WorkspaceTemplate, TrainingSlice, ToadaConductorSlot } from '../types';
import { createSpeedTrainerSlice } from './slices/speedTrainerSlice';
import { createTrainingSlice } from './slices/trainingSlice';
import { createPlaybackSlice, PlaybackSlice } from './slices/playbackSlice';
import { createHistorySlice, HistorySlice } from './slices/historySlice';
import { createTransportSlice, TransportSlice } from './slices/transportSlice';
import { createStructureSlice, StructureSlice } from './slices/songStructureSlice';
import { createUISlice, UISlice, TimelineClipboard, TimelineClipboardEntry } from './slices/timelineSlice';
import { createTrackHierarchySlice, TrackHierarchySlice } from './slices/trackHierarchySlice';

import { usePerformanceStore } from './usePerformanceStore';
// Nous aurons besoin d'instrumentsConfig pour extraire les paroles
import { instrumentsConfig } from '../data';
import { transposeNoteString, isVoiceStepProlongation, isVoiceHoldSyllable, isVoiceHoldNote } from '../utils/musicTheory';
import { canTransferPatterns, convertStepsToVocalRole, getInstrumentFamily } from '../utils/instrumentCompatibility';
import { getNextPatternName } from '../utils/patternNaming';
import { faderPositionToGain, gainToFaderPosition } from '../utils/audioMath';
import { resizePatternBeatResolution, resizePatternAllBeatsResolution, clampStepIndex } from '../utils/vocalTimingUtils';
import { deployToadaCycle } from '../utils/toadaArrangement';
import { 
  isToadaBus, 
  isToadaChild, 
  getTrackSolidBlockId, 
  isSequencerVisibleTrack, 
  isLinearDAWVisibleTrack, 
  getVisibleTimelineTrackIds 
} from './helpers/trackVisibilityHelpers';
import { 
  ensureToadaBus, 
  sanitizeRodaTrackOrder, 
  applyRadii 
} from './helpers/trackRodaGeometryHelpers';
import { 
  TrackMeta, 
  getCachedTrackMeta, 
  selectTracksMeta 
} from './helpers/trackMetaCache';
import { 
  getEffectiveMuteState, 
  getEffectiveVolume, 
  getTrackFamilyIds 
} from './helpers/trackMixerSelectors';
import { 
  getDisplayedMixerTracks, 
  getAllOrderedMixerTracks 
} from './helpers/mixerOrderingHelpers';

// ---------------------------------------------------------
// 1. TRACK SLICE
export interface MasterEffectsActiveState {
  compressor: boolean;
  reverb: boolean;
  disto: boolean;
}

// ---------------------------------------------------------
export interface TrackSlice extends TrackHierarchySlice {
  tracks: TrackGroup[];
  activeAoVivoTrackId: number | null;
  isLetraActive: boolean;
  tracksVersion: number;
  masterFX: MasterFX;
  masterEffectsActive: MasterEffectsActiveState;
  armedTrackId: number | null;
  armedPatternId: number | null;
  isPatternRecording: boolean;
  toadaConductorSlots: ToadaConductorSlot[];
  pendingToadaQuickDeploy: { measureIdx: number } | null;
  
  // Actions
  setToadaConductorSlots: (slots: ToadaConductorSlot[]) => void;
  setPendingToadaQuickDeploy: (val: { measureIdx: number } | null) => void;
  deployToadaCycleAtMeasure: (startMeasureIdx: number) => void;
  toggleMasterEffectActive: (effect: 'compressor' | 'reverb' | 'disto') => void;
  setMasterEffectsActive: (active: Partial<MasterEffectsActiveState>) => void;
  setIsLetraActive: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleLetraActive: () => void;
  toggleArmPattern: (trackId: number, patternId: number) => void;
  disarmAllPatterns: () => void;
  setIsPatternRecording: (val: boolean | ((prev: boolean) => boolean)) => void;
  togglePatternRecording: () => void;
  updatePatternStep: (trackId: number, patternId: number, stepIdx: number, char: string | number | [string, string]) => void;
  rodaTrackOrder: number[];
  setRodaTrackOrder: (order: number[] | ((prev: number[]) => number[])) => void;
  setTracks: (tracks: TrackGroup[] | ((prev: TrackGroup[]) => TrackGroup[])) => void;
  setSelectedPatternId: (trackIdOrPatternId: number, patternId?: number) => void;
  handleCreateFromTemplate: (
    template: WorkspaceTemplate,
    audio?: {
      setMasterEQ?: (eq: { low: number; mid: number; high: number }) => void;
      setMasterCompressor?: (comp: { threshold: number; ratio: number }) => void;
      setMasterVol?: (vol: number) => void;
      setReverbDecay?: (decay: number) => void;
      setMasterReverbVol?: (vol: number) => void;
    }
  ) => void;
  setActiveAoVivoTrackId: (id: number | null) => void;
  handleTrackInstrumentIdxChange: (id: number, targetInstIdx: number) => void;
  handleTrackMuteToggle: (id: number) => void;
  handleTrackSoloToggle: (id: number) => void;
  handleTrackHideToggle: (id: number) => void;
  handleTrackDelete: (id: number) => void;
  duplicateTrack: (trackId: number) => number | null;
  handleTrackVolumeChange: (id: number, val: number) => void;
  handleTrackReverbChange: (id: number, val: number) => void;
  handleTrackPanChange: (id: number, val: number) => void;
  handleTrackSwingChange: (id: number, val: number) => void;
  handlePatternSwingChange: (trackId: number, patternId: number, val: number) => void;
  handleTrackBalancoChange: (trackId: number | string, presetId?: string, amount?: number) => void;
  setTrackBalancoIntensity: (trackId: number | string, intensity: number) => void;
  setTrackBalancoPreset: (trackId: number | string, presetId: string) => void;
  handlePatternBalancoChange: (trackId: number | string, patternId: number, presetId?: string, amount?: number) => void;
  handleResetPatternMicrotimings: (trackId: number, patternId: number) => void;
  setTrackFxSend: (trackId: number, fxType: 'reverb' | 'distortion', value: number) => void;
  setTrackPan: (trackId: number, value: number) => void;
  handleTimelinePatternAssign: (trackId: number, patternId: number | null | undefined, measureIdx: number) => void;
  handleTimelinePatternVariationToggle: (trackId: number, patternId: number, measureIdx: number, val: boolean) => void;
  duplicateMeasurePattern: (trackId: number, srcIdx: number, targetIdx: number) => void;
  repeatPatternRange: (trackId: number, srcIdx: number, count: number) => void;
  handleTrackStepsChange: (trackId: number, patternId: number, targetSteps: number) => void;
  handleTrackStepVolumeChange: (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => void;
  handleTrackStepDecayChange?: (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => void;
  handleTrackStepMicrotimingChange?: (trackId: number, patternId: number, stepIdx: number | number[], val: number, subIndex?: 0 | 1) => void;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  handleSetPatternAllBeatsResolution: (patternId: number, newResolution: number) => void;
  setMasterFxVolume: (fxType: 'reverb' | 'distortion', volume: number) => void;
  setMasterFxParam: (fxType: 'reverb' | 'distortion', param: 'time' | 'drive', value: number) => void;
  toggleMasterFxMute: (fxType: 'reverb' | 'distortion') => void;
  setMasterFX: (masterFX: MasterFX) => void;
  handleTrackLowCutToggle: (id: number) => void;
  handleTrackEQChange: (id: number, bands: Partial<TrackGroup['eqBands']>) => void;
  handleTrackEQReset: (id: number) => void;
  handleVocalLatencyChange: (trackId: number, patternId: number, latencyMs: number) => void;
  setTrackTuning: (trackId: number, tuning: number) => void;
  handleTrackMeasureVolChange: (trackId: number, mIdx: number, val: number) => void;
  handleTrackMeasureVolTransitionChange: (trackId: number, mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleTrackMeasurePanChange: (trackId: number, mIdx: number, val: number) => void;
  handleTrackMeasurePanTransitionChange: (trackId: number, mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleTrackMeasureReverbChange: (trackId: number, mIdx: number, val: number) => void;
  handleTrackMeasureReverbTransitionChange: (trackId: number, mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  toggleTrackAutomationBypass: (trackId: number, type: 'volume' | 'pan' | 'reverb') => void;
}

export * from './helpers/trackVisibilityHelpers';
export * from './helpers/trackRodaGeometryHelpers';

const createTrackSlice: StateCreator<SequencerStore, [], [], TrackSlice> = (set, get) => ({
  tracks: [],
  rodaTrackOrder: [],
  activeAoVivoTrackId: null,
  isLetraActive: false,
  tracksVersion: 0,
  armedTrackId: null,
  armedPatternId: null,
  isPatternRecording: false,
  toadaConductorSlots: [],
  setToadaConductorSlots: (slots) => set({ toadaConductorSlots: slots }),
  pendingToadaQuickDeploy: null,
  setPendingToadaQuickDeploy: (val) => set({ pendingToadaQuickDeploy: val }),
  deployToadaCycleAtMeasure: (startMeasureIdx) => {
    get().pushUndoState();
    set((state) => deployToadaCycle(state, startMeasureIdx));
  },
  toggleArmPattern: (trackId, patternId) => set(state => {
    const isCurrentlyArmed = state.armedPatternId === patternId;
    const nextArmed = isCurrentlyArmed ? null : patternId;
    return {
      armedTrackId: isCurrentlyArmed ? null : trackId,
      armedPatternId: nextArmed,
      isPatternRecording: nextArmed === null ? false : state.isPatternRecording,
    };
  }),
  disarmAllPatterns: () => set({ armedTrackId: null, armedPatternId: null, isPatternRecording: false }),
  setIsPatternRecording: (updater) => set(state => ({
    isPatternRecording: typeof updater === 'function' ? updater(state.isPatternRecording) : updater
  })),
  togglePatternRecording: () => set(state => {
    if (!state.isPatternRecording) {
      if (state.armedPatternId === null || state.armedTrackId === null) {
        return { isPatternRecording: false };
      }
      return { isPatternRecording: true };
    }
    return { isPatternRecording: false };
  }),
  updatePatternStep: (trackId, patternId, stepIdx, char) => set(state => {
    let changed = false;
    const nextTracks = state.tracks.map(t => {
      if (t.id === trackId || String(t.id) === String(trackId)) {
        const nextPatterns = t.patterns.map(p => {
          if (p.id === patternId) {
            const currentActive = [...(p.activeSteps || [])];
            const maxSteps = p.steps || currentActive.length || 16;
            while (currentActive.length < maxSteps) {
              currentActive.push(0);
            }
            if (stepIdx >= 0 && stepIdx < maxSteps) {
              const nextVal = char === '0' ? 0 : char;
              currentActive[stepIdx] = nextVal;
              changed = true;
              let nextNotes = p.notes;
              if ((nextVal === 0 || nextVal === '0') && p.notes) {
                nextNotes = [...p.notes];
                nextNotes[stepIdx] = '';
              }
              return {
                ...p,
                activeSteps: currentActive,
                ...(nextNotes ? { notes: nextNotes } : {})
              };
            }
          }
          return p;
        });
        return { ...t, patterns: nextPatterns };
      }
      return t;
    });

    if (!changed) return state;

    return {
      tracks: nextTracks,
      tracksVersion: state.tracksVersion + 1,
    };
  }),
  masterFX: {
    reverb: {
      returnVolume: 70,
      time: 30,
      isMuted: false
    },
    distortion: {
      returnVolume: 0,
      drive: 20,
      isMuted: false
    }
  },
  masterEffectsActive: {
    compressor: true,
    reverb: true,
    disto: true
  },
  setTracks: (updater) => set(state => {
    let nextTracks = typeof updater === 'function' ? (updater as any)(state.tracks) : updater;
    if (nextTracks === state.tracks) return {};
    nextTracks = ensureToadaBus(nextTracks);
    const isStructureSame = nextTracks.length === state.tracks.length && 
      nextTracks.every((t: TrackGroup, i: number) => t.id === state.tracks[i]?.id && t.instrumentIdx === state.tracks[i]?.instrumentIdx && t.isHidden === state.tracks[i]?.isHidden);
    const nextRodaOrder = isStructureSame ? state.rodaTrackOrder : sanitizeRodaTrackOrder(state.rodaTrackOrder, nextTracks);
    const finalTracks = isStructureSame ? nextTracks : applyRadii(nextTracks, nextRodaOrder);
    return {
      tracks: finalTracks,
      rodaTrackOrder: nextRodaOrder,
      tracksVersion: state.tracksVersion + 1
    };
  }),
  setSelectedPatternId: (trackIdOrPatternId: number, patternId?: number) => set(state => {
    if (patternId === undefined) {
      const pId = trackIdOrPatternId;
      const editingTrackId = state.editingTrackId;
      return {
        selectedPatternId: pId,
        tracks: editingTrackId !== null
          ? state.tracks.map(t => (t.id === editingTrackId || String(t.id) === String(editingTrackId))
              ? { ...t, selectedPatternId: pId }
              : t)
          : state.tracks,
        tracksVersion: state.tracksVersion + 1
      };
    }
    const tId = trackIdOrPatternId;
    return {
      selectedPatternId: patternId,
      tracks: state.tracks.map(t => (t.id === tId || String(t.id) === String(tId))
        ? { ...t, selectedPatternId: patternId }
        : t
      ),
      tracksVersion: state.tracksVersion + 1
    };
  }),
  setRodaTrackOrder: (updater) => set(state => {
    const rawOrder = typeof updater === 'function' ? updater(state.rodaTrackOrder) : updater;
    const nextOrder = sanitizeRodaTrackOrder(rawOrder, state.tracks);
    return {
      rodaTrackOrder: nextOrder,
      tracks: applyRadii(state.tracks, nextOrder),
      tracksVersion: state.tracksVersion + 1
    };
  }),
  handleReorderRodaTracks: (activeId, overId) => get().handleReorderRodaTracks(activeId, overId),
  setActiveAoVivoTrackId: (id) => set({ activeAoVivoTrackId: id }),
  setIsLetraActive: (val) => set(state => ({ isLetraActive: typeof val === 'function' ? val(state.isLetraActive) : val })),
  toggleLetraActive: () => set(state => ({ isLetraActive: !state.isLetraActive })),
  
  handleReorderMixerTracks: (activeId, overId) => get().handleReorderMixerTracks(activeId, overId),
  handleReorderWagon: (wagonTrackIds, overTrackId) => get().handleReorderWagon(wagonTrackIds, overTrackId),
  handleReorderTracksDnd: (activeId, overId) => get().handleReorderTracksDnd(activeId, overId),


  handleTrackInstrumentIdxChange: (id, targetInstIdx) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, instrumentIdx: targetInstIdx } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackMuteToggle: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id || String(t.id) === String(id)) ? { ...t, isMute: !t.isMute } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackSoloToggle: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id || String(t.id) === String(id)) ? { ...t, isSolo: !t.isSolo } : t),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackHideToggle: (id) => {
    set((state) => {
      const next = state.tracks.map((t) => t.id === id ? { ...t, isHidden: !t.isHidden } : t);
      return { tracks: applyRadii(next) };
    });
  },

  handleTrackDelete: (id) => {
    get().pushUndoState();
    set((state) => {
      let updated = [...state.tracks];
      const trackToDelete = updated.find(t => t.id === id);

      if (trackToDelete) {
        // Cas A : On supprime un bus de liaison de partition
        if (trackToDelete.isLinkFolder) {
          const patternsToCopy = JSON.parse(JSON.stringify(trackToDelete.patterns));
          updated = updated.map(t => {
            if (String(t.linkedToTrackId) === String(id)) {
              return {
                ...t,
                linkedToTrackId: undefined,
                isLinkMaster: undefined,
                busId: undefined,
                patterns: patternsToCopy.length ? patternsToCopy : t.patterns
              };
            }
            return t;
          });
        }
        // Cas B : On supprime l'instrument maître d'un bus de liaison
        else if (trackToDelete.isLinkMaster && trackToDelete.linkedToTrackId) {
          const busId = trackToDelete.linkedToTrackId;
          const busTrack = updated.find(t => String(t.id) === String(busId) && t.isLinkFolder);
          const patternsToCopy = busTrack ? JSON.parse(JSON.stringify(busTrack.patterns)) : [];

          // Dissoudre le groupe pour les autres enfants restants
          updated = updated.map(t => {
            if (t.id !== id && String(t.linkedToTrackId) === String(busId)) {
              return {
                ...t,
                linkedToTrackId: undefined,
                isLinkMaster: undefined,
                busId: undefined,
                patterns: patternsToCopy.length ? patternsToCopy : t.patterns
              };
            }
            return t;
          });
        }
        // Cas C : On supprime un bus audio de section (isBusFolder: true)
        else if (trackToDelete.isBusFolder) {
          updated = updated.filter(t => String(t.busId) !== String(id));
        }
      }


      // Effectuer la suppression physique de la piste
      const remaining = updated.filter((t) => t.id !== id);
      const nextRodaOrder = sanitizeRodaTrackOrder(state.rodaTrackOrder, remaining);
      const nextTracks = applyRadii(remaining, nextRodaOrder);
      const nextMeta = selectTracksMeta({ ...state, tracks: nextTracks });
      const nextDisplayed = getDisplayedMixerTracks(nextMeta);
      const maxOffset = Math.max(0, nextDisplayed.length - 8);
      const nextMixerBankOffset = Math.min(state.mixerBankOffset || 0, maxOffset);

      return { 
        tracks: nextTracks,
        rodaTrackOrder: nextRodaOrder,
        tracksVersion: state.tracksVersion + 1,
        mixerBankOffset: nextMixerBankOffset
      };
    });
  },

  duplicateTrack: (trackId) => {
    get().pushUndoState();
    const state = get();
    const originalTrack = state.tracks.find(t => t.id === trackId);
    if (!originalTrack) return null;

    const inst = instrumentsConfig[originalTrack.instrumentIdx];
    const newTrackId = Date.now() + Math.floor(Math.random() * 1000);
    const copySuffix = state.lang === 'fr' ? '(Copie)' : '(Cópia)';
    const baseName = originalTrack.customName || inst?.name || 'Piste';
    const newName = `${baseName} ${copySuffix}`;

    // Cloner tous les motifs avec de nouveaux IDs
    const newPatterns: Pattern[] = (originalTrack.patterns || []).map((p, pIdx) => ({
      ...JSON.parse(JSON.stringify(p)),
      id: newTrackId + 10 + pIdx + Math.floor(Math.random() * 100),
    }));

    const newTrack: TrackGroup = {
      ...JSON.parse(JSON.stringify(originalTrack)),
      id: newTrackId,
      customName: newName,
      patterns: newPatterns,
      selectedPatternId: newPatterns[0]?.id || 0,
      linkedToTrackId: undefined,
      isLinkMaster: undefined,
    };

    // Insérer la nouvelle piste immédiatement après l'originale dans tracks
    const origIndex = state.tracks.findIndex(t => t.id === trackId);
    const nextTracks = [...state.tracks];
    if (origIndex !== -1) {
      nextTracks.splice(origIndex + 1, 0, newTrack);
    } else {
      nextTracks.push(newTrack);
    }

    // Consigne 1 : Insérer impérativement le nouvel identifiant dans rodaTrackOrder immédiatement après la piste d'origine
    let nextRodaOrder = [...(state.rodaTrackOrder || [])];
    const rodaIdx = nextRodaOrder.indexOf(trackId);
    if (rodaIdx !== -1) {
      nextRodaOrder.splice(rodaIdx + 1, 0, newTrackId);
    } else {
      nextRodaOrder.push(newTrackId);
    }
    nextRodaOrder = sanitizeRodaTrackOrder(nextRodaOrder, nextTracks);

    // Consigne 1 : Appliquer applyRadii pour recalculer instantanément les rayons sans décalage
    const finalTracks = applyRadii(nextTracks, nextRodaOrder);

    set({
      tracks: finalTracks,
      rodaTrackOrder: nextRodaOrder,
      tracksVersion: state.tracksVersion + 1,
    });

    return newTrackId;
  },

  handleTrackVolumeChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, volumeVal: val } : t)
    }));
  },

  handleTrackMeasureVolChange: (trackId, mIdx, val) => {
    const state = get();
    if (
      state.selectedAutomationType === 'volume' &&
      state.selectedAutomationTrackId === trackId &&
      state.selectedAutomationRange &&
      mIdx >= state.selectedAutomationRange.start &&
      mIdx <= state.selectedAutomationRange.end
    ) {
      state.setGroupedAutomationValue('volume', val, trackId);
      return;
    }
    const totalM = get().totalMeasures || 8;
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const currentVols = t.measureVols ? [...t.measureVols] : Array(totalM).fill(t.volumeVal ?? 75);
          while (currentVols.length < totalM) {
            currentVols.push(t.volumeVal ?? 75);
          }
          currentVols[mIdx] = val;
          return { ...t, measureVols: currentVols };
        }
        return t;
      })
    }));
  },

  handleTrackMeasureVolTransitionChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const currentTrans = t.measureVolTransitions ? [...t.measureVolTransitions] : Array(totalM).fill('immediate' as const);
          while (currentTrans.length < totalM) {
            currentTrans.push('immediate');
          }
          currentTrans[mIdx] = val;
          return { ...t, measureVolTransitions: currentTrans };
        }
        return t;
      })
    }));
  },

  handleTrackMeasurePanChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const currentPans = t.measurePans ? [...t.measurePans] : Array(totalM).fill(t.panVal ?? t.pan ?? 0);
          while (currentPans.length < totalM) {
            currentPans.push(t.panVal ?? t.pan ?? 0);
          }
          currentPans[mIdx] = val;
          return { ...t, measurePans: currentPans };
        }
        return t;
      })
    }));
  },

  handleTrackMeasurePanTransitionChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const currentTrans = t.measurePanTransitions ? [...t.measurePanTransitions] : Array(totalM).fill('immediate' as const);
          while (currentTrans.length < totalM) {
            currentTrans.push('immediate');
          }
          currentTrans[mIdx] = val;
          return { ...t, measurePanTransitions: currentTrans };
        }
        return t;
      })
    }));
  },

  handleTrackMeasureReverbChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const defaultRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
          const currentReverbs = t.measureReverbSends ? [...t.measureReverbSends] : Array(totalM).fill(defaultRev);
          while (currentReverbs.length < totalM) {
            currentReverbs.push(defaultRev);
          }
          currentReverbs[mIdx] = val;
          return { ...t, measureReverbSends: currentReverbs };
        }
        return t;
      })
    }));
  },

  handleTrackMeasureReverbTransitionChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const currentTrans = t.measureReverbTransitions ? [...t.measureReverbTransitions] : Array(totalM).fill('immediate' as const);
          while (currentTrans.length < totalM) {
            currentTrans.push('immediate');
          }
          currentTrans[mIdx] = val;
          return { ...t, measureReverbTransitions: currentTrans };
        }
        return t;
      })
    }));
  },

  toggleTrackAutomationBypass: (trackId, type) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          const currentBypass = t.automationBypass || {};
          return {
            ...t,
            automationBypass: {
              ...currentBypass,
              [type]: !currentBypass[type]
            }
          };
        }
        return t;
      })
    }));
  },

  setTrackTuning: (trackId: number, tuning: number) => {
    set((state) => ({
      tracks: state.tracks.map(t => 
        t.id === trackId ? { ...t, tuning } : t
      )
    }));
  },

  handleTrackReverbChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, reverbVal: val } : t)
    }));
  },

  handleTrackPanChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, panVal: val, pan: val } : t)
    }));
  },

  handleTrackSwingChange: (id, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === id ? { ...t, swingIntensity: val, balancoAmount: val } : t)
    }));
  },

  handlePatternSwingChange: (trackId, patternId, val) => {
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map((p) => (p.id === patternId ? { ...p, swingIntensity: val, balancoAmount: val } : p))
          };
        }
        return t;
      })
    }));
  },

  handleTrackBalancoChange: (trackId, presetId, amount) => {
    set((state) => ({
      tracks: state.tracks.map((t) => {
        const matchesId = String(t.id) === String(trackId);
        const matchesInst = instrumentsConfig[t.instrumentIdx]?.id === String(trackId);
        if (matchesId || matchesInst) {
          return {
            ...t,
            ...(presetId !== undefined ? { balancoPresetId: presetId } : {}),
            ...(amount !== undefined ? { balancoAmount: amount, swingIntensity: amount } : {})
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  setTrackBalancoIntensity: (trackId, intensity) => {
    get().handleTrackBalancoChange(trackId, undefined, intensity);
  },

  setTrackBalancoPreset: (trackId, presetId) => {
    get().handleTrackBalancoChange(trackId, presetId, undefined);
  },

  handlePatternBalancoChange: (trackId, patternId, presetId, amount) => {
    set((state) => ({
      tracks: state.tracks.map((t) => {
        const matchesId = String(t.id) === String(trackId);
        const matchesInst = instrumentsConfig[t.instrumentIdx]?.id === String(trackId);
        if (matchesId || matchesInst) {
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (String(p.id) === String(patternId)) {
                return {
                  ...p,
                  balancoPresetId: presetId,
                  ...(amount !== undefined ? { balancoAmount: amount, swingIntensity: amount } : {})
                };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleResetPatternMicrotimings: (trackId, patternId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (p.id === patternId) {
                return {
                  ...p,
                  microtimings: Array(p.steps).fill(0),
                  variations: p.variations?.map(v => ({
                    ...v,
                    microtimings: Array(v.steps.length).fill(0)
                  }))
                };
              }
              return p;
            })
          };
        }
        return t;
      })
    }));
  },

  setTrackFxSend: (trackId, fxType, value) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              reverbVal: fxType === 'reverb' ? value : t.reverbVal,
              fxSends: {
                reverb: fxType === 'reverb' ? value : (t.fxSends?.reverb ?? t.reverbVal ?? 0),
                distortion: fxType === 'distortion' ? value : (t.fxSends?.distortion ?? 0)
              }
            }
          : t
      )
    }));
  },

  setTrackPan: (trackId, value) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, pan: value, panVal: value } : t
      )
    }));
  },

  handleTrackLowCutToggle: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, lowCut: !t.lowCut } : t
      )
    }));
  },

  handleTrackEQChange: (id, bands) => {
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === id) {
          const currentBands = t.eqBands || {
            low: { f: 100, g: 0 },
            mid: { f: 1000, g: 0, q: 'wide' as const },
            high: { f: 8000, g: 0 }
          };
          if (!bands) return t;
          return {
            ...t,
            eqBands: {
              low: { ...currentBands.low, ...(bands.low || {}) },
              mid: { ...currentBands.mid, ...(bands.mid || {}) },
              high: { ...currentBands.high, ...(bands.high || {}) }
            }
          };
        }
        return t;
      })
    }));
  },

  handleTrackEQReset: (id) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id
          ? {
              ...t,
              eqBands: {
                low: { f: 100, g: 0 },
                mid: { f: 1000, g: 0, q: 'wide' as const },
                high: { f: 8000, g: 0 }
              }
            }
          : t
      )
    }));
  },

  handleLinkTrack: (trackId, linkedToTrackId) => get().handleLinkTrack(trackId, linkedToTrackId),
  handleDetachTrack: (trackId) => get().handleDetachTrack(trackId),
  handleCreateLinkGroup: (trackId, name) => get().handleCreateLinkGroup(trackId, name),
  handleCreateBus: (trackId, name) => get().handleCreateBus(trackId, name),
  handleCreateCustomBus: (trackIds, name) => get().handleCreateCustomBus(trackIds, name),
  handleCreateCustomLinkGroup: (masterTrackId, slaveTrackIds, name) => get().handleCreateCustomLinkGroup(masterTrackId, slaveTrackIds, name),

  handleCreateFromTemplate: (template, audio) => {
    get().pushUndoState();

    // Application des réglages audio Master si fournis
    if (template.masterSettings && audio) {
      const { options, masterSettings } = template;
      if (options.includeEQ && masterSettings.masterEQ && audio.setMasterEQ) {
        audio.setMasterEQ(masterSettings.masterEQ);
      }
      if (options.includeStructure && masterSettings.masterCompressor && audio.setMasterCompressor) {
        audio.setMasterCompressor(masterSettings.masterCompressor);
      }
      if (options.includeVolumePan && masterSettings.masterVol !== undefined && audio.setMasterVol) {
        audio.setMasterVol(masterSettings.masterVol);
      }
      if (options.includeFX) {
        if (masterSettings.reverbDecay !== undefined && audio.setReverbDecay) {
          audio.setReverbDecay(masterSettings.reverbDecay);
        }
        if (masterSettings.masterReverbVol !== undefined && audio.setMasterReverbVol) {
          audio.setMasterReverbVol(masterSettings.masterReverbVol);
        }
      }
    }

    set((state) => {
      const { options, tracks: tplTracks, rodaTrackOrder: tplRodaOrder } = template;
      const idMap = new Map<number, number>();
      const now = Date.now();

      // 1. Allouer de nouveaux identifiants uniques et étanches pour chaque piste
      tplTracks.forEach((t, i) => {
        idMap.set(t.id, now + i * 10 + Math.floor(Math.random() * 9));
      });

      const totalM = state.totalMeasures || 4;

      // 2. Reconstruire chaque piste avec nouveaux IDs et grilles de notes vierges
      const newTracks: TrackGroup[] = tplTracks.map((t, i) => {
        const newId = idMap.get(t.id)!;
        const newPatternId = now + 1000 + i;
        const steps = 16;
        const isPureBus = Boolean(options.includeStructure && t.isBusFolder && !t.isLinkFolder);

        const blankPattern: Pattern = {
          id: newPatternId,
          name: state.lang === 'pt' ? 'Padrão 1' : 'Motif 1',
          steps,
          activeSteps: Array(steps).fill(0),
          volumes: Array(steps).fill(80),
          decays: Array(steps).fill(100),
          microtimings: Array(steps).fill(0),
          measureAssignments: Array(totalM).fill(true),
          lyrics: Array(steps).fill(''),
          notes: Array(steps).fill('')
        };

        // Remappage strict des relations de bus et de liens (Track Linking)
        let newBusId: string | undefined = undefined;
        if (options.includeStructure && t.busId) {
          const oldParent = Number(t.busId);
          newBusId = idMap.has(oldParent) ? String(idMap.get(oldParent)) : undefined;
        }

        let newLinkedToTrackId: string | undefined = undefined;
        if (options.includeStructure && t.linkedToTrackId) {
          const oldLinkParent = Number(t.linkedToTrackId);
          newLinkedToTrackId = idMap.has(oldLinkParent) ? String(idMap.get(oldLinkParent)) : undefined;
        }

        const newTrack: TrackGroup = {
          id: newId,
          instrumentIdx: t.instrumentIdx,
          customName: t.customName,
          patterns: isPureBus ? [] : [blankPattern],
          selectedPatternId: isPureBus ? 0 : newPatternId,
          isMute: false,
          isSolo: false,
          isHidden: false,
          isBusFolder: options.includeStructure ? t.isBusFolder : undefined,
          isLinkFolder: options.includeStructure ? t.isLinkFolder : undefined,
          isLinkMaster: options.includeStructure ? t.isLinkMaster : undefined,
          busId: newBusId,
          linkedToTrackId: newLinkedToTrackId,
          volumeVal: options.includeVolumePan ? (t.volumeVal ?? 75) : 75,
          pan: options.includeVolumePan ? (t.pan ?? 0) : 0,
          panVal: options.includeVolumePan ? (t.panVal ?? 0) : 0,
          eqBands: options.includeEQ && t.eqBands ? JSON.parse(JSON.stringify(t.eqBands)) : undefined,
          lowCut: options.includeEQ ? (t.lowCut ?? false) : false,
          reverbVal: options.includeFX ? (t.reverbVal ?? 0) : 0,
          fxSends: options.includeFX && t.fxSends ? { ...t.fxSends } : { reverb: 0, distortion: 0 }
        };

        return newTrack;
      });

      // 3. Remappage strict de rodaTrackOrder
      let newRodaTrackOrder: number[] = [];
      if (options.includeDisplayOrder && tplRodaOrder && tplRodaOrder.length > 0) {
        newRodaTrackOrder = tplRodaOrder
          .map(oldId => idMap.get(oldId))
          .filter((id): id is number => id !== undefined);
      }
      // Compléter si des pistes manquent
      newTracks.forEach(t => {
        if (!newRodaTrackOrder.includes(t.id)) {
          newRodaTrackOrder.push(t.id);
        }
      });

      // 4. Calcul des rayons visuels de la Roda
      const finalTracks = applyRadii(newTracks, newRodaTrackOrder);

      const nextMasterFX = (options.includeFX && template.masterSettings?.masterFX)
        ? JSON.parse(JSON.stringify(template.masterSettings.masterFX))
        : state.masterFX;

      return {
        tracks: finalTracks,
        rodaTrackOrder: newRodaTrackOrder,
        tracksVersion: state.tracksVersion + 1,
        masterFX: nextMasterFX,
        // Réinitialiser les données du morceau (ardoise vierge)
        letras: '',
        metadata: {
          toada: '',
          nacao: '',
          compositor: '',
          ritmo: '',
          youtubeUrl: '',
          rhythmSignals: []
        },
        songSections: [],
        songMarkers: [],
        activeAoVivoTrackId: null,
        isLetraActive: false
      };
    });
  },

  handleSetPatternOverride: (trackId, measureIdx, patternId) => get().handleSetPatternOverride(trackId, measureIdx, patternId),
  handleAssignToBus: (trackId, busId) => get().handleAssignToBus(trackId, busId),
  handleToggleFoldBus: (busId) => get().handleToggleFoldBus(busId),
  handleToggleSequencerFoldBus: (busId) => get().handleToggleSequencerFoldBus(busId),

  setMasterFxVolume: (fxType, volume) => {
    set((state) => ({
      masterFX: {
        ...state.masterFX,
        [fxType]: {
          ...state.masterFX[fxType],
          returnVolume: volume
        }
      }
    }));
  },

  setMasterFxParam: (fxType, param, value) => {
    set((state) => ({
      masterFX: {
        ...state.masterFX,
        [fxType]: {
          ...state.masterFX[fxType],
          [param]: value
        }
      }
    }));
  },

  toggleMasterFxMute: (fxType) => {
    set((state) => ({
      masterFX: {
        ...state.masterFX,
        [fxType]: {
          ...state.masterFX[fxType],
          isMuted: !state.masterFX[fxType].isMuted
        }
      }
    }));
  },

  setMasterFX: (masterFX) => {
    set({ masterFX });
  },

  toggleMasterEffectActive: (effect) => {
    set((state) => ({
      masterEffectsActive: {
        ...state.masterEffectsActive,
        [effect]: !state.masterEffectsActive[effect]
      }
    }));
  },

  setMasterEffectsActive: (active) => {
    set((state) => ({
      masterEffectsActive: {
        ...state.masterEffectsActive,
        ...active
      }
    }));
  },

  handleTimelinePatternAssign: (trackId, patternId, measureIdx) => {
    get().pushUndoState();
    set((state) => {
      const clickedTrack = state.tracks.find(t => t.id === trackId);
      const isLinkedSlave = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
      const isLinkMaster = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

      let targetTrackId = trackId;
      let targetTrack = clickedTrack;
      if (isLinkMaster && clickedTrack?.linkedToTrackId) {
        targetTrackId = Number(clickedTrack.linkedToTrackId);
        const master = state.tracks.find(t => t.id === targetTrackId);
        if (master) targetTrack = master;
      } else if (patternId !== null && patternId !== undefined) {
        const ownerTrack = state.tracks.find(t => t.patterns.some(p => p.id === patternId));
        if (ownerTrack) {
          targetTrackId = ownerTrack.id;
          targetTrack = ownerTrack;
        }
      }

      const pattern = targetTrack?.patterns?.find(p => p.id === patternId);
      const stepsPerMeasure = 16;
      const spanMeasures = pattern ? Math.max(1, Math.round((pattern.steps || stepsPerMeasure) / stepsPerMeasure)) : 1;

      let nextTotal = state.totalMeasures;
      let nextTracks = [...state.tracks];
      let nextTimeSigs = [...state.measureTimeSigs];
      let nextBpms = [...state.measureBpms];
      let nextBpmTransitions = [...state.measureBpmTransitions];
      let nextVols = [...state.measureVols];
      let nextVolTransitions = [...state.measureVolTransitions];
      let nextSignals = [...state.measureSignals];

      const requiredTotal = measureIdx + spanMeasures;
      if (requiredTotal > nextTotal) {
        nextTotal = requiredTotal;
        const expandArray = <T>(arr: T[], fillValue: T): T[] => {
          const next = [...(arr || [])];
          while (next.length < nextTotal) next.push(fillValue);
          return next;
        };
        nextTimeSigs = expandArray(nextTimeSigs, state.timeSig || '4/4');
        nextBpms = expandArray(nextBpms, state.bpm || 100);
        nextBpmTransitions = expandArray(nextBpmTransitions, 'immediate');
        nextVols = expandArray(nextVols, 100);
        nextVolTransitions = expandArray(nextVolTransitions, 'immediate');
        nextSignals = expandArray(nextSignals, null);
        nextTracks = nextTracks.map(t => ({
          ...t,
          measureVols: t.measureVols ? expandArray(t.measureVols, t.volumeVal ?? 75) : undefined,
          measureVolTransitions: t.measureVolTransitions ? expandArray(t.measureVolTransitions, 'immediate' as const) : undefined,
          measurePans: t.measurePans ? expandArray(t.measurePans, t.panVal ?? t.pan ?? 0) : undefined,
          measurePanTransitions: t.measurePanTransitions ? expandArray(t.measurePanTransitions, 'immediate' as const) : undefined,
          measureReverbSends: t.measureReverbSends ? expandArray(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
          measureReverbTransitions: t.measureReverbTransitions ? expandArray(t.measureReverbTransitions, 'immediate' as const) : undefined,
          patterns: t.patterns.map(p => ({
            ...p,
            measureAssignments: expandArray(p.measureAssignments || [], false),
            measureAllowVariations: p.measureAllowVariations ? expandArray(p.measureAllowVariations, true) : undefined
          }))
        }));
      }

      if (isLinkedSlave) {
        return {
          totalMeasures: nextTotal,
          measureTimeSigs: nextTimeSigs,
          measureBpms: nextBpms,
          measureBpmTransitions: nextBpmTransitions,
          measureVols: nextVols,
          measureVolTransitions: nextVolTransitions,
          measureSignals: nextSignals,
          tracks: nextTracks.map(t => {
            if (t.id === trackId) {
              const overrides = { ...(t.patternOverrides || {}) };
              for (let offset = 0; offset < spanMeasures; offset++) {
                const m = measureIdx + offset;
                if (patternId === undefined) {
                  delete overrides[m];
                } else {
                  overrides[m] = patternId;
                }
              }
              return { ...t, patternOverrides: overrides };
            }
            return t;
          }),
          tracksVersion: state.tracksVersion + 1
        };
      }

      const isToadaTrackId = isToadaBus(clickedTrack || {});
      const puxTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

      return {
        totalMeasures: nextTotal,
        measureTimeSigs: nextTimeSigs,
        measureBpms: nextBpms,
        measureBpmTransitions: nextBpmTransitions,
        measureVols: nextVols,
        measureVolTransitions: nextVolTransitions,
        measureSignals: nextSignals,
        tracks: nextTracks.map(t => {
          // Si on efface explicitement depuis la ligne maîtresse Toada (silence global de la toada)
          if (isToadaTrackId && patternId === null && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                while (assign.length < nextTotal) assign.push(false);
                for (let offset = 0; offset < spanMeasures; offset++) {
                  assign[measureIdx + offset] = false;
                }
                return { ...p, measureAssignments: assign };
              })
            };
          }
          
          if (t.id === targetTrackId) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                while (assign.length < nextTotal) assign.push(false);
                for (let offset = 0; offset < spanMeasures; offset++) {
                  assign[measureIdx + offset] = p.id === patternId;
                }
                return { ...p, measureAssignments: assign };
              })
            };
          }
          return t;
        }),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleTimelinePatternVariationToggle: (trackId, patternId, measureIdx, val) => {
    get().pushUndoState();
    set(state => {
      const ownerTrack = state.tracks.find(t => t.patterns.some(p => p.id === patternId));
      const targetTrackId = ownerTrack ? ownerTrack.id : trackId;
      return {
        tracks: state.tracks.map(t => {
          if (t.id === targetTrackId) {
            return {
              ...t,
              patterns: t.patterns.map(p => {
                if (p.id === patternId) {
                  const currentAllow = p.measureAllowVariations ? [...p.measureAllowVariations] : Array(state.totalMeasures).fill(true);
                  currentAllow[measureIdx] = val;
                  return { ...p, measureAllowVariations: currentAllow };
                }
                return p;
              })
            };
          }
          return t;
        }),
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  duplicateMeasurePattern: (trackId: number, srcIdx: number, targetIdx: number) => {
    if (targetIdx < 0 || targetIdx === srcIdx) return;
    const state = get();
    if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && targetIdx >= state.maxMeasuresAllowed) {
      alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
      return;
    }

    get().pushUndoState();

    set((curr) => {
      let nextTotal = curr.totalMeasures;
      let nextTracks = [...curr.tracks];
      let nextTimeSigs = [...curr.measureTimeSigs];
      let nextBpms = [...curr.measureBpms];
      let nextBpmTransitions = [...curr.measureBpmTransitions];
      let nextVols = [...curr.measureVols];
      let nextVolTransitions = [...curr.measureVolTransitions];
      let nextSignals = [...curr.measureSignals];

      if (targetIdx >= nextTotal) {
        nextTotal = targetIdx + 1;
        const expandArray = <T>(arr: T[], fillValue: T): T[] => {
          const next = [...arr];
          while (next.length < nextTotal) next.push(fillValue);
          return next;
        };
        nextTimeSigs = expandArray(nextTimeSigs, curr.timeSig);
        nextBpms = expandArray(nextBpms, curr.bpm);
        nextBpmTransitions = expandArray(nextBpmTransitions, 'immediate');
        nextVols = expandArray(nextVols, 75);
        nextVolTransitions = expandArray(nextVolTransitions, 'immediate');
        nextSignals = expandArray(nextSignals, null);
        nextTracks = nextTracks.map(t => ({
          ...t,
          measureVols: t.measureVols ? expandArray(t.measureVols, t.volumeVal ?? 75) : undefined,
          measureVolTransitions: t.measureVolTransitions ? expandArray(t.measureVolTransitions, 'immediate' as const) : undefined,
          measurePans: t.measurePans ? expandArray(t.measurePans, t.panVal ?? t.pan ?? 0) : undefined,
          measurePanTransitions: t.measurePanTransitions ? expandArray(t.measurePanTransitions, 'immediate' as const) : undefined,
          measureReverbSends: t.measureReverbSends ? expandArray(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
          measureReverbTransitions: t.measureReverbTransitions ? expandArray(t.measureReverbTransitions, 'immediate' as const) : undefined,
          patterns: t.patterns.map(p => ({
            ...p,
            measureAssignments: expandArray(p.measureAssignments || [], false),
            measureAllowVariations: p.measureAllowVariations ? expandArray(p.measureAllowVariations, true) : undefined
          }))
        }));
      }

      const clickedTrack = nextTracks.find(t => t.id === trackId);
      if (!clickedTrack) return { totalMeasures: nextTotal, tracks: nextTracks };

      const isLinkedSlave = clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
      const isLinkMaster = clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

      if (isLinkedSlave) {
        const srcOverride = clickedTrack.patternOverrides?.[srcIdx];
        return {
          totalMeasures: nextTotal,
          measureTimeSigs: nextTimeSigs,
          measureBpms: nextBpms,
          measureBpmTransitions: nextBpmTransitions,
          measureVols: nextVols,
          measureVolTransitions: nextVolTransitions,
          measureSignals: nextSignals,
          tracks: nextTracks.map(t => {
            if (t.id === trackId) {
              const overrides = { ...(t.patternOverrides || {}) };
              if (srcOverride === undefined) {
                delete overrides[targetIdx];
              } else {
                overrides[targetIdx] = srcOverride;
              }
              return { ...t, patternOverrides: overrides };
            }
            return t;
          }),
          tracksVersion: curr.tracksVersion + 1
        };
      }

      let targetTrackId = trackId;
      let sourceOwnerTrack = clickedTrack;
      if (isLinkMaster && clickedTrack.linkedToTrackId) {
        targetTrackId = Number(clickedTrack.linkedToTrackId);
        const owner = nextTracks.find(t => t.id === targetTrackId);
        if (owner) sourceOwnerTrack = owner;
      }

      const isToadaTrackId = isToadaBus(clickedTrack);
      const puxTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

      let activePatternId: number | null = null;
      let allowVarVal: boolean | undefined = undefined;
      const activePat = sourceOwnerTrack.patterns.find(p => p.measureAssignments?.[srcIdx]);
      if (activePat) {
        activePatternId = activePat.id;
        allowVarVal = activePat.measureAllowVariations?.[srcIdx];
      }

      return {
        totalMeasures: nextTotal,
        measureTimeSigs: nextTimeSigs,
        measureBpms: nextBpms,
        measureBpmTransitions: nextBpmTransitions,
        measureVols: nextVols,
        measureVolTransitions: nextVolTransitions,
        measureSignals: nextSignals,
        tracks: nextTracks.map(t => {
          // Duplication depuis la ligne maîtresse Toada : dupliquer fidèlement Puxador ET Coro
          if (isToadaTrackId && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
            const trackActivePat = t.patterns.find(p => p.measureAssignments?.[srcIdx]);
            const trackActivePatId = trackActivePat?.id ?? null;
            const trackAllowVarVal = trackActivePat?.measureAllowVariations?.[srcIdx];

            return {
              ...t,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                while (assign.length < nextTotal) assign.push(false);
                assign[targetIdx] = Boolean(trackActivePatId !== null && p.id === trackActivePatId);
                const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
                if (nextVariations && trackAllowVarVal !== undefined && p.id === trackActivePatId) {
                  while (nextVariations.length < nextTotal) nextVariations.push(true);
                  nextVariations[targetIdx] = trackAllowVarVal;
                }
                return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
              })
            };
          }

          if (t.id === targetTrackId) {
            let nextVols = t.measureVols;
            let nextTrans = t.measureVolTransitions;
            if (t.measureVols) {
              const vols = [...t.measureVols];
              while (vols.length < nextTotal) vols.push(t.volumeVal ?? 75);
              vols[targetIdx] = vols[srcIdx] !== undefined ? vols[srcIdx] : (t.volumeVal ?? 75);
              nextVols = vols;
            }
            if (t.measureVolTransitions) {
              const trans = [...t.measureVolTransitions];
              while (trans.length < nextTotal) trans.push('immediate' as const);
              trans[targetIdx] = trans[srcIdx] || 'immediate';
              nextTrans = trans;
            }

            let nextPans = t.measurePans;
            let nextPanTrans = t.measurePanTransitions;
            if (t.measurePans) {
              const pans = [...t.measurePans];
              while (pans.length < nextTotal) pans.push(t.panVal ?? t.pan ?? 0);
              pans[targetIdx] = pans[srcIdx] !== undefined ? pans[srcIdx] : (t.panVal ?? t.pan ?? 0);
              nextPans = pans;
            }
            if (t.measurePanTransitions) {
              const pTrans = [...t.measurePanTransitions];
              while (pTrans.length < nextTotal) pTrans.push('immediate' as const);
              pTrans[targetIdx] = pTrans[srcIdx] || 'immediate';
              nextPanTrans = pTrans;
            }

            let nextReverbs = t.measureReverbSends;
            let nextReverbTrans = t.measureReverbTransitions;
            if (t.measureReverbSends) {
              const revs = [...t.measureReverbSends];
              while (revs.length < nextTotal) revs.push(t.fxSends?.reverb ?? t.reverbVal ?? 0);
              revs[targetIdx] = revs[srcIdx] !== undefined ? revs[srcIdx] : (t.fxSends?.reverb ?? t.reverbVal ?? 0);
              nextReverbs = revs;
            }
            if (t.measureReverbTransitions) {
              const rTrans = [...t.measureReverbTransitions];
              while (rTrans.length < nextTotal) rTrans.push('immediate' as const);
              rTrans[targetIdx] = rTrans[srcIdx] || 'immediate';
              nextReverbTrans = rTrans;
            }

            return {
              ...t,
              measureVols: nextVols,
              measureVolTransitions: nextTrans,
              measurePans: nextPans,
              measurePanTransitions: nextPanTrans,
              measureReverbSends: nextReverbs,
              measureReverbTransitions: nextReverbTrans,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                while (assign.length < nextTotal) assign.push(false);
                assign[targetIdx] = p.id === activePatternId;
                const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
                if (nextVariations && allowVarVal !== undefined && p.id === activePatternId) {
                  while (nextVariations.length < nextTotal) nextVariations.push(true);
                  nextVariations[targetIdx] = allowVarVal;
                }
                return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
              })
            };
          }
          return t;
        }),
        tracksVersion: curr.tracksVersion + 1
      };
    });
  },

  repeatPatternRange: (trackId: number, srcIdx: number, count: number) => {
    if (count <= 0) return;
    const maxTargetIdx = srcIdx + count;
    const state = get();
    if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && maxTargetIdx >= state.maxMeasuresAllowed) {
      alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
      return;
    }

    get().pushUndoState();

    set((curr) => {
      let nextTotal = curr.totalMeasures;
      let nextTracks = [...curr.tracks];
      let nextTimeSigs = [...curr.measureTimeSigs];
      let nextBpms = [...curr.measureBpms];
      let nextBpmTransitions = [...curr.measureBpmTransitions];
      let nextVols = [...curr.measureVols];
      let nextVolTransitions = [...curr.measureVolTransitions];
      let nextSignals = [...curr.measureSignals];

      if (maxTargetIdx >= nextTotal) {
        nextTotal = maxTargetIdx + 1;
        const expandArray = <T>(arr: T[], fillValue: T): T[] => {
          const next = [...arr];
          while (next.length < nextTotal) next.push(fillValue);
          return next;
        };
        nextTimeSigs = expandArray(nextTimeSigs, curr.timeSig);
        nextBpms = expandArray(nextBpms, curr.bpm);
        nextBpmTransitions = expandArray(nextBpmTransitions, 'immediate');
        nextVols = expandArray(nextVols, 100);
        nextVolTransitions = expandArray(nextVolTransitions, 'immediate');
        nextSignals = expandArray(nextSignals, null);
        nextTracks = nextTracks.map(t => ({
          ...t,
          measureVols: t.measureVols ? expandArray(t.measureVols, t.volumeVal ?? 75) : undefined,
          measureVolTransitions: t.measureVolTransitions ? expandArray(t.measureVolTransitions, 'immediate' as const) : undefined,
          measurePans: t.measurePans ? expandArray(t.measurePans, t.panVal ?? t.pan ?? 0) : undefined,
          measurePanTransitions: t.measurePanTransitions ? expandArray(t.measurePanTransitions, 'immediate' as const) : undefined,
          measureReverbSends: t.measureReverbSends ? expandArray(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
          measureReverbTransitions: t.measureReverbTransitions ? expandArray(t.measureReverbTransitions, 'immediate' as const) : undefined,
          patterns: t.patterns.map(p => ({
            ...p,
            measureAssignments: expandArray(p.measureAssignments || [], false),
            measureAllowVariations: p.measureAllowVariations ? expandArray(p.measureAllowVariations, true) : undefined
          }))
        }));
      }

      const clickedTrack = nextTracks.find(t => t.id === trackId);
      if (!clickedTrack) return { totalMeasures: nextTotal, tracks: nextTracks };

      const isLinkedSlave = clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
      const isLinkMaster = clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

      if (isLinkedSlave) {
        const srcOverride = clickedTrack.patternOverrides?.[srcIdx];
        return {
          totalMeasures: nextTotal,
          measureTimeSigs: nextTimeSigs,
          measureBpms: nextBpms,
          measureBpmTransitions: nextBpmTransitions,
          measureVols: nextVols,
          measureVolTransitions: nextVolTransitions,
          measureSignals: nextSignals,
          tracks: nextTracks.map(t => {
            if (t.id === trackId) {
              const overrides = { ...(t.patternOverrides || {}) };
              for (let step = 1; step <= count; step++) {
                const targetIdx = srcIdx + step;
                if (srcOverride === undefined) {
                  delete overrides[targetIdx];
                } else {
                  overrides[targetIdx] = srcOverride;
                }
              }
              return { ...t, patternOverrides: overrides };
            }
            return t;
          }),
          tracksVersion: curr.tracksVersion + 1
        };
      }

      let targetTrackId = trackId;
      let sourceOwnerTrack = clickedTrack;
      if (isLinkMaster && clickedTrack.linkedToTrackId) {
        targetTrackId = Number(clickedTrack.linkedToTrackId);
        const owner = nextTracks.find(t => t.id === targetTrackId);
        if (owner) sourceOwnerTrack = owner;
      }

      const isToadaTrackId = isToadaBus(clickedTrack);
      const puxTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

      let activePatternId: number | null = null;
      let allowVarVal: boolean | undefined = undefined;
      const activePat = sourceOwnerTrack.patterns.find(p => p.measureAssignments?.[srcIdx]);
      if (activePat) {
        activePatternId = activePat.id;
        allowVarVal = activePat.measureAllowVariations?.[srcIdx];
      }

      return {
        totalMeasures: nextTotal,
        measureTimeSigs: nextTimeSigs,
        measureBpms: nextBpms,
        measureBpmTransitions: nextBpmTransitions,
        measureVols: nextVols,
        measureVolTransitions: nextVolTransitions,
        measureSignals: nextSignals,
        tracks: nextTracks.map(t => {
          // Duplication multi-mesures depuis la ligne maîtresse Toada : dupliquer fidèlement Puxador ET Coro
          if (isToadaTrackId && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
            const trackActivePat = t.patterns.find(p => p.measureAssignments?.[srcIdx]);
            const trackActivePatId = trackActivePat?.id ?? null;
            const trackAllowVarVal = trackActivePat?.measureAllowVariations?.[srcIdx];

            return {
              ...t,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                while (assign.length < nextTotal) assign.push(false);
                const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
                if (nextVariations && trackAllowVarVal !== undefined && p.id === trackActivePatId) {
                  while (nextVariations.length < nextTotal) nextVariations.push(true);
                }
                for (let step = 1; step <= count; step++) {
                  const targetIdx = srcIdx + step;
                  assign[targetIdx] = Boolean(trackActivePatId !== null && p.id === trackActivePatId);
                  if (nextVariations && trackAllowVarVal !== undefined && p.id === trackActivePatId) {
                    nextVariations[targetIdx] = trackAllowVarVal;
                  }
                }
                return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
              })
            };
          }

          if (t.id === targetTrackId) {
            let nextVols = t.measureVols;
            let nextTrans = t.measureVolTransitions;
            if (t.measureVols) {
              const vols = [...t.measureVols];
              while (vols.length < nextTotal) vols.push(t.volumeVal ?? 75);
              for (let step = 1; step <= count; step++) {
                vols[srcIdx + step] = vols[srcIdx] !== undefined ? vols[srcIdx] : (t.volumeVal ?? 75);
              }
              nextVols = vols;
            }
            if (t.measureVolTransitions) {
              const trans = [...t.measureVolTransitions];
              while (trans.length < nextTotal) trans.push('immediate' as const);
              for (let step = 1; step <= count; step++) {
                trans[srcIdx + step] = trans[srcIdx] || 'immediate';
              }
              nextTrans = trans;
            }

            let nextPans = t.measurePans;
            let nextPanTrans = t.measurePanTransitions;
            if (t.measurePans) {
              const pans = [...t.measurePans];
              while (pans.length < nextTotal) pans.push(t.panVal ?? t.pan ?? 0);
              for (let step = 1; step <= count; step++) {
                pans[srcIdx + step] = pans[srcIdx] !== undefined ? pans[srcIdx] : (t.panVal ?? t.pan ?? 0);
              }
              nextPans = pans;
            }
            if (t.measurePanTransitions) {
              const pTrans = [...t.measurePanTransitions];
              while (pTrans.length < nextTotal) pTrans.push('immediate' as const);
              for (let step = 1; step <= count; step++) {
                pTrans[srcIdx + step] = pTrans[srcIdx] || 'immediate';
              }
              nextPanTrans = pTrans;
            }

            let nextReverbs = t.measureReverbSends;
            let nextReverbTrans = t.measureReverbTransitions;
            if (t.measureReverbSends) {
              const revs = [...t.measureReverbSends];
              while (revs.length < nextTotal) revs.push(t.fxSends?.reverb ?? t.reverbVal ?? 0);
              for (let step = 1; step <= count; step++) {
                revs[srcIdx + step] = revs[srcIdx] !== undefined ? revs[srcIdx] : (t.fxSends?.reverb ?? t.reverbVal ?? 0);
              }
              nextReverbs = revs;
            }
            if (t.measureReverbTransitions) {
              const rTrans = [...t.measureReverbTransitions];
              while (rTrans.length < nextTotal) rTrans.push('immediate' as const);
              for (let step = 1; step <= count; step++) {
                rTrans[srcIdx + step] = rTrans[srcIdx] || 'immediate';
              }
              nextReverbTrans = rTrans;
            }

            return {
              ...t,
              measureVols: nextVols,
              measureVolTransitions: nextTrans,
              measurePans: nextPans,
              measurePanTransitions: nextPanTrans,
              measureReverbSends: nextReverbs,
              measureReverbTransitions: nextReverbTrans,
              patterns: t.patterns.map(p => {
                const assign = [...p.measureAssignments];
                while (assign.length < nextTotal) assign.push(false);
                const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
                if (nextVariations && allowVarVal !== undefined && p.id === activePatternId) {
                  while (nextVariations.length < nextTotal) nextVariations.push(true);
                }
                for (let step = 1; step <= count; step++) {
                  const targetIdx = srcIdx + step;
                  assign[targetIdx] = p.id === activePatternId;
                  if (nextVariations && allowVarVal !== undefined && p.id === activePatternId) {
                    nextVariations[targetIdx] = allowVarVal;
                  }
                }
                return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
              })
            };
          }
          return t;
        }),
        tracksVersion: curr.tracksVersion + 1
      };
    });
  },

  handleVocalLatencyChange: (trackId, patternId, latencyMs) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map((p) => {
              if (p.id === patternId) {
                return { ...p, vocalLatency: latencyMs };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepsChange: (trackId, patternId, targetSteps) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === patternId) {
                const arrSteps = Array(targetSteps).fill(0);
                const arrLyrics = Array(targetSteps).fill('');
                const arrNotes = Array(targetSteps).fill('');
                const arrVols = Array(targetSteps).fill(80);
                const arrDecays = Array(targetSteps).fill(100);
                const arrMicro = Array(targetSteps).fill(0);

                for (let i = 0; i < Math.min(targetSteps, p.steps); i++) {
                  arrSteps[i] = p.activeSteps[i];
                  arrLyrics[i] = p.lyrics?.[i] || '';
                  arrNotes[i] = p.notes?.[i] || '';
                  if (p.volumes && p.volumes[i] !== undefined) arrVols[i] = p.volumes[i];
                  if (p.decays && p.decays[i] !== undefined) arrDecays[i] = p.decays[i];
                  if (p.microtimings && p.microtimings[i] !== undefined) arrMicro[i] = p.microtimings[i];
                }

                return {
                  ...p,
                  steps: targetSteps,
                  activeSteps: arrSteps,
                  lyrics: arrLyrics,
                  notes: arrNotes,
                  volumes: arrVols,
                  decays: arrDecays,
                  microtimings: arrMicro,
                };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepVolumeChange: (trackId, patternId, stepIdx, val, subIndex) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === patternId) {
                const copyVols = [...(p.volumes || Array(p.steps).fill(80))];
                const updateVal = (idx: number) => {
                  const isSplit = Array.isArray(p.activeSteps[idx]);
                  if (subIndex === undefined) {
                    copyVols[idx] = isSplit ? [val, val] : val;
                  } else {
                    const base0 = Array.isArray(copyVols[idx]) ? (copyVols[idx] as [number, number])[0] : (copyVols[idx] as number ?? 80);
                    const base1 = Array.isArray(copyVols[idx]) ? (copyVols[idx] as [number, number])[1] : (copyVols[idx] as number ?? 80);
                    copyVols[idx] = subIndex === 0 ? [val, base1] : [base0, val];
                  }
                };
                if (Array.isArray(stepIdx)) {
                  stepIdx.forEach(idx => updateVal(idx));
                } else {
                  updateVal(stepIdx);
                }
                return { ...p, volumes: copyVols };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepDecayChange: (trackId, patternId, stepIdx, val, subIndex) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === patternId) {
                const copyDecays = [...(p.decays || Array(p.steps).fill(100))];
                const updateVal = (idx: number) => {
                  const isSplit = Array.isArray(p.activeSteps[idx]);
                  if (subIndex === undefined) {
                    copyDecays[idx] = isSplit ? [val, val] : val;
                  } else {
                    const base0 = Array.isArray(copyDecays[idx]) ? (copyDecays[idx] as [number, number])[0] : (copyDecays[idx] as number ?? 100);
                    const base1 = Array.isArray(copyDecays[idx]) ? (copyDecays[idx] as [number, number])[1] : (copyDecays[idx] as number ?? 100);
                    copyDecays[idx] = subIndex === 0 ? [val, base1] : [base0, val];
                  }
                };
                if (Array.isArray(stepIdx)) {
                  stepIdx.forEach(idx => updateVal(idx));
                } else {
                  updateVal(stepIdx);
                }
                return { ...p, decays: copyDecays };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handleTrackStepMicrotimingChange: (trackId, patternId, stepIdx, val, subIndex) => {
    get().pushUndoState();
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === patternId) {
                const copyMicros = [...(p.microtimings || Array(p.steps).fill(0))];
                const updateVal = (idx: number) => {
                  const isSplit = Array.isArray(p.activeSteps[idx]);
                  if (subIndex === undefined) {
                    copyMicros[idx] = isSplit ? [val, val] : val;
                  } else {
                    const base0 = Array.isArray(copyMicros[idx]) ? (copyMicros[idx] as [number, number])[0] : (copyMicros[idx] as number ?? 0);
                    const base1 = Array.isArray(copyMicros[idx]) ? (copyMicros[idx] as [number, number])[1] : (copyMicros[idx] as number ?? 0);
                    copyMicros[idx] = subIndex === 0 ? [val, base1] : [base0, val];
                  }
                };
                if (Array.isArray(stepIdx)) {
                  stepIdx.forEach(idx => updateVal(idx));
                } else {
                  updateVal(stepIdx);
                }
                return { ...p, microtimings: copyMicros };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    }));
  },

  handlePatternBeatResolutionChange: (patternId, beatIndex, newResolution) => {
    get().pushUndoState();
    set((state) => {
      let targetPatternSteps: number | null = null;
      const updatedTracks = state.tracks.map(t => ({
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === patternId) {
            const { updatedPattern, targetSteps } = resizePatternBeatResolution(p, beatIndex, newResolution, state.timeSig);
            targetPatternSteps = targetSteps;
            return updatedPattern as Pattern;
          }
          return p;
        })
      }));

      const nextSelectedStep = (state.selectedPatternId === patternId && targetPatternSteps !== null)
        ? clampStepIndex(state.selectedStepIdx, targetPatternSteps)
        : state.selectedStepIdx;

      return {
        tracks: updatedTracks,
        selectedStepIdx: nextSelectedStep,
        tracksVersion: state.tracksVersion + 1
      };
    });
  },

  handleSetPatternAllBeatsResolution: (patternId, newResolution) => {
    get().pushUndoState();
    set((state) => {
      let targetPatternSteps: number | null = null;
      const updatedTracks = state.tracks.map(t => ({
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === patternId) {
            const { updatedPattern, targetSteps } = resizePatternAllBeatsResolution(p, newResolution, state.timeSig);
            targetPatternSteps = targetSteps;
            return updatedPattern as Pattern;
          }
          return p;
        })
      }));

      const nextSelectedStep = (state.selectedPatternId === patternId && targetPatternSteps !== null)
        ? clampStepIndex(state.selectedStepIdx, targetPatternSteps)
        : state.selectedStepIdx;

      return {
        tracks: updatedTracks,
        selectedStepIdx: nextSelectedStep,
        tracksVersion: state.tracksVersion + 1
      };
    });
  }
});

// ---------------------------------------------------------
// 2. STRUCTURE SLICE (Extracted to src/stores/slices/songStructureSlice.ts)
// ---------------------------------------------------------


// ---------------------------------------------------------
// 3. PLAYBACK SLICE & 4. HISTORY SLICE
// ---------------------------------------------------------
export * from './slices/playbackSlice';
export * from './slices/historySlice';
export * from './helpers/undoHistoryHelpers';

// ---------------------------------------------------------
// 5. CLIPBOARD SLICE
// ---------------------------------------------------------
export interface InstrumentPatternsClipboard {
  sourceTrackId: number;
  sourceType: string;
  sourceName: string;
  patterns: Pattern[];
  timelineAssignments?: Record<string, boolean[]>;
  sourceInstrumentIdx?: number;
  sourceInstId?: string;
  sourceFamily?: string;
}

export interface VoiceStepData {
  note: string;
  syllable: string;
  role: 'P' | 'C' | '0';
  isProlongation?: boolean;
}

export interface VoiceStepsClipboard {
  steps: VoiceStepData[];
}

export interface SelectedStepRange {
  start: { isPreRoll: boolean; step: number };
  end: { isPreRoll: boolean; step: number };
  patternId?: number;
  trackId?: number;
}

export interface ClipboardSlice {
  copiedPattern: Pattern | null;
  copiedSection: any | null;
  instrumentPatternsClipboard: InstrumentPatternsClipboard | null;
  vocalNotesClipboard: string[] | null;
  voiceStepsClipboard: VoiceStepsClipboard | null;

  setCopiedPattern: (pattern: Pattern | null) => void;
  setCopiedSection: (section: any | null) => void;
  handleCopyPattern: (pattern: Pattern) => void;
  handleCopySongSection: (section: SongSection) => void;
  handlePasteSongSection: (destStartMeasure: number) => void;
  copyAllTrackPatterns: (trackId: number) => void;
  pasteAllTrackPatterns: (targetTrackId: number, modeOrApplyTimeline?: boolean | 'libraryOnly' | 'libraryAndTimeline') => void;
  copySelectedNotesRange: (rangeOverride?: SelectedStepRange | null) => void;
  pasteNotesOnlyStartingAt: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number) => void;
  copyVoiceStepsRange: (rangeOverride?: SelectedStepRange | null, trackIdOverride?: number, patternIdOverride?: number) => void;
  cutVoiceStepsRange: (rangeOverride?: SelectedStepRange | null, trackIdOverride?: number, patternIdOverride?: number) => void;
  pasteVoiceSteps: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number, notesOnly?: boolean) => void;
}

const createClipboardSlice: StateCreator<SequencerStore, [], [], ClipboardSlice> = (set, get) => ({
  copiedPattern: null,
  copiedSection: null,
  instrumentPatternsClipboard: null,
  vocalNotesClipboard: null,
  voiceStepsClipboard: null,

  copyVoiceStepsRange: (rangeOverride, trackIdOverride, patternIdOverride) => {
    const state = get();
    let effectiveRange: SelectedStepRange | null = rangeOverride || state.selectedStepRange;

    if (!effectiveRange && state.selectedStepIdx !== null && state.selectedStepIdx !== undefined) {
      const isPreRoll = Boolean(state.selectedStepIsPreRoll);
      effectiveRange = {
        start: { isPreRoll, step: state.selectedStepIdx },
        end: { isPreRoll, step: state.selectedStepIdx }
      };
    }

    // Fallback DOM si le store n'avait pas encore enregistré le pas focalisé
    if (!effectiveRange && typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      const cellEl = activeEl?.closest?.('.voice-step-cell, [data-step-type="voice"], [data-step-index]');
      if (cellEl) {
        const stepAttr = cellEl.getAttribute('data-step-index');
        const isPreRollAttr = cellEl.getAttribute('data-is-preroll');
        if (stepAttr !== null) {
          const step = parseInt(stepAttr, 10);
          const isPreRoll = isPreRollAttr === 'true';
          effectiveRange = {
            start: { isPreRoll, step },
            end: { isPreRoll, step }
          };
          set({ selectedStepIdx: step, selectedStepIsPreRoll: isPreRoll });
        }
      }
    }

    if (!effectiveRange) {
      console.warn('⚠️ [Toada Copy] Aucune plage ni cellule vocale sélectionnée.');
      return;
    }

    // Résolution robuste de la piste
    let targetTrackId = trackIdOverride;
    if (targetTrackId === undefined || targetTrackId === null) {
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        const cellEl = activeEl?.closest?.('[data-track-id]');
        if (cellEl) {
          const tAttr = cellEl.getAttribute('data-track-id');
          if (tAttr) targetTrackId = parseInt(tAttr, 10);
        }
      }
    }
    if (targetTrackId === undefined || targetTrackId === null) {
      targetTrackId = state.editingTrackId ?? undefined;
    }

    let track = targetTrackId !== undefined
      ? state.tracks.find(t => t.id === targetTrackId || String(t.id) === String(targetTrackId))
      : undefined;

    if (!track) {
      // Trouver une piste vocale réelle avec des motifs non vides (exclure les bus dossiers)
      track = state.tracks.find(t => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        const isVoiceType = instId === 'puxador' || instId === 'coro' || String(t.id).includes('coro') || String(t.id).includes('puxador');
        return isVoiceType && !t.isBusFolder && t.patterns && t.patterns.length > 0;
      });
    }
    if (!track) {
      track = state.tracks.find(t => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        return (instId === 'puxador' || instId === 'coro') && t.patterns && t.patterns.length > 0;
      });
    }
    if (!track) {
      console.warn('⚠️ [Toada Copy] Aucune piste vocale trouvée.');
      return;
    }

    // Résolution robuste du motif source selon l'ordre strict :
    // 1er choix : patternIdOverride
    // 2e choix : effectiveRange?.patternId
    // 3e choix : data-pattern-id sur document.activeElement
    // 4e choix : state.selectedPatternId
    // 5e choix : track.selectedPatternId
    let targetPatternId = patternIdOverride;
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      if (effectiveRange?.patternId !== undefined && effectiveRange?.patternId !== null && effectiveRange?.patternId !== 0) {
        targetPatternId = effectiveRange.patternId;
      }
    }
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        const cellEl = activeEl?.closest?.('[data-pattern-id]');
        if (cellEl) {
          const pAttr = cellEl.getAttribute('data-pattern-id');
          if (pAttr) targetPatternId = parseInt(pAttr, 10);
        }
      }
    }
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      targetPatternId = state.selectedPatternId ?? undefined;
    }
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      targetPatternId = track.selectedPatternId ?? undefined;
    }

    let pattern = targetPatternId !== undefined
      ? track.patterns.find(p => p.id === targetPatternId || String(p.id) === String(targetPatternId))
      : undefined;

    if (!pattern && track.patterns && track.patterns.length > 0) {
      pattern = track.patterns.find(p => p.id === track.selectedPatternId) || track.patterns[0];
    }
    if (!pattern) {
      console.warn('⚠️ [Toada Copy] Aucun motif trouvé pour la piste', track.id);
      return;
    }

    const instId = instrumentsConfig[track.instrumentIdx]?.id;
    const isCoro = instId === 'coro' || String(track.id).toLowerCase().includes('coro') || track.customName?.toLowerCase().includes('coro');
    const defaultVoiceRole: 'P' | 'C' = isCoro ? 'C' : 'P';

    const preRollStepsCount = pattern.preRollActiveSteps?.length || 16;
    const toLinear = (p: { isPreRoll: boolean; step: number }) => p.isPreRoll ? p.step : (preRollStepsCount + p.step);
    const minLinear = Math.min(toLinear(effectiveRange.start), toLinear(effectiveRange.end));
    const maxLinear = Math.max(toLinear(effectiveRange.start), toLinear(effectiveRange.end));

    const isStepActiveVal = (val: any) => val !== undefined && val !== null && val !== 0 && val !== '0';

    const copiedSteps: VoiceStepData[] = [];
    for (let l = minLinear; l <= maxLinear; l++) {
      if (l < preRollStepsCount) {
        const note = pattern.preRollNotes?.[l] || '';
        const syllable = pattern.preRollLyrics?.[l] || '';
        const act = pattern.preRollActiveSteps?.[l];
        const role: 'P' | 'C' | '0' = (act === 'P' || act === 'C')
          ? act
          : (isStepActiveVal(act) ? defaultVoiceRole : '0');

        const curActive = isStepActiveVal(act);
        const prevAct = l > 0 ? pattern.preRollActiveSteps?.[l - 1] : 0;
        const prevActive = isStepActiveVal(prevAct);
        const curNoteTrim = (note || '').trim();
        const prevNote = l > 0 ? (pattern.preRollNotes?.[l - 1] || '').trim() : '';
        const isProlongation = isVoiceStepProlongation(
          curActive,
          prevActive,
          curNoteTrim,
          prevNote,
          syllable
        );

        copiedSteps.push({ note, syllable, role, isProlongation });
      } else {
        const stepIdx = l - preRollStepsCount;
        const note = pattern.notes?.[stepIdx] || '';
        const syllable = pattern.lyrics?.[stepIdx] || '';
        const act = pattern.activeSteps?.[stepIdx];
        const role: 'P' | 'C' | '0' = (act === 'P' || act === 'C')
          ? act
          : (isStepActiveVal(act) ? defaultVoiceRole : '0');

        const curActive = isStepActiveVal(act);
        const prevAct = stepIdx > 0 ? pattern.activeSteps?.[stepIdx - 1] : (pattern.preRollActiveSteps?.[preRollStepsCount - 1] || 0);
        const prevActive = isStepActiveVal(prevAct);
        const curNoteTrim = (note || '').trim();
        const prevNote = stepIdx > 0 ? (pattern.notes?.[stepIdx - 1] || '').trim() : (pattern.preRollNotes?.[preRollStepsCount - 1] || '').trim();
        const isProlongation = isVoiceStepProlongation(
          curActive,
          prevActive,
          curNoteTrim,
          prevNote,
          syllable
        );

        copiedSteps.push({ note, syllable, role, isProlongation });
      }
    }

    set({
      voiceStepsClipboard: { steps: copiedSteps },
      vocalNotesClipboard: copiedSteps.map(s => s.note)
    });

    console.log('📋 [Toada Copy Source]', {
      patternId: pattern.id,
      patternName: pattern.name,
      stepsCount: copiedSteps.length
    });
    console.log('✅ [Toada Copied Steps]', copiedSteps.length, copiedSteps);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
  },

  cutVoiceStepsRange: (rangeOverride, trackIdOverride, patternIdOverride) => {
    const state = get();
    let effectiveRange: SelectedStepRange | null = rangeOverride || state.selectedStepRange;
    if (!effectiveRange && state.selectedStepIdx !== null && state.selectedStepIdx !== undefined) {
      const isPreRoll = Boolean(state.selectedStepIsPreRoll);
      effectiveRange = {
        start: { isPreRoll, step: state.selectedStepIdx },
        end: { isPreRoll, step: state.selectedStepIdx }
      };
    }
    if (!effectiveRange && typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      const cellEl = activeEl?.closest?.('.voice-step-cell, [data-step-type="voice"], [data-step-index]');
      if (cellEl) {
        const stepAttr = cellEl.getAttribute('data-step-index');
        const isPreRollAttr = cellEl.getAttribute('data-is-preroll');
        if (stepAttr !== null) {
          const step = parseInt(stepAttr, 10);
          const isPreRoll = isPreRollAttr === 'true';
          effectiveRange = {
            start: { isPreRoll, step },
            end: { isPreRoll, step }
          };
          set({ selectedStepIdx: step, selectedStepIsPreRoll: isPreRoll });
        }
      }
    }
    if (!effectiveRange) return;

    // 1. Sauvegarde préalable de l'état pour Undo atomique unique
    state.pushUndoState();

    // 2. Copier d'abord la sélection dans le presse-papier
    state.copyVoiceStepsRange(effectiveRange, trackIdOverride, patternIdOverride);

    let targetTrackId = trackIdOverride;
    if (targetTrackId === undefined || targetTrackId === null) {
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        const cellEl = activeEl?.closest?.('[data-track-id]');
        if (cellEl) {
          const tAttr = cellEl.getAttribute('data-track-id');
          if (tAttr) targetTrackId = parseInt(tAttr, 10);
        }
      }
    }
    if (targetTrackId === undefined || targetTrackId === null) {
      targetTrackId = state.editingTrackId ?? undefined;
    }

    let track = targetTrackId !== undefined
      ? state.tracks.find(t => t.id === targetTrackId || String(t.id) === String(targetTrackId))
      : undefined;

    if (!track) {
      track = state.tracks.find(t => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        const isVoiceType = instId === 'puxador' || instId === 'coro' || String(t.id).includes('coro') || String(t.id).includes('puxador');
        return isVoiceType && !t.isBusFolder && t.patterns && t.patterns.length > 0;
      });
    }
    if (!track) return;

    // Résolution robuste du motif source selon l'ordre strict :
    let targetPatternId = patternIdOverride;
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      if (effectiveRange?.patternId !== undefined && effectiveRange?.patternId !== null && effectiveRange?.patternId !== 0) {
        targetPatternId = effectiveRange.patternId;
      }
    }
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        const cellEl = activeEl?.closest?.('[data-pattern-id]');
        if (cellEl) {
          const pAttr = cellEl.getAttribute('data-pattern-id');
          if (pAttr) targetPatternId = parseInt(pAttr, 10);
        }
      }
    }
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      targetPatternId = state.selectedPatternId ?? undefined;
    }
    if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
      targetPatternId = track.selectedPatternId ?? undefined;
    }

    let pattern = targetPatternId !== undefined
      ? track.patterns.find(p => p.id === targetPatternId || String(p.id) === String(targetPatternId))
      : undefined;

    if (!pattern && track.patterns && track.patterns.length > 0) {
      pattern = track.patterns.find(p => p.id === track.selectedPatternId) || track.patterns[0];
    }
    if (!pattern) return;

    const preRollStepsCount = pattern.preRollActiveSteps?.length || 16;
    const patternSteps = pattern.steps || 16;

    const toLinear = (p: { isPreRoll: boolean; step: number }) => p.isPreRoll ? p.step : (preRollStepsCount + p.step);
    const minLinear = Math.min(toLinear(effectiveRange.start), toLinear(effectiveRange.end));
    const maxLinear = Math.max(toLinear(effectiveRange.start), toLinear(effectiveRange.end));

    // Préparer les tableaux clonés
    const preRollNotes = [...(pattern.preRollNotes || Array(preRollStepsCount).fill(''))];
    while (preRollNotes.length < preRollStepsCount) preRollNotes.push('');
    const preRollLyrics = [...(pattern.preRollLyrics || Array(preRollStepsCount).fill(''))];
    while (preRollLyrics.length < preRollStepsCount) preRollLyrics.push('');
    const preRollActiveSteps = [...(pattern.preRollActiveSteps || Array(preRollStepsCount).fill(0))];
    while (preRollActiveSteps.length < preRollStepsCount) preRollActiveSteps.push(0);

    const notes = [...(pattern.notes || Array(patternSteps).fill(''))];
    while (notes.length < patternSteps) notes.push('');
    const lyrics = [...(pattern.lyrics || Array(patternSteps).fill(''))];
    while (lyrics.length < patternSteps) lyrics.push('');
    const activeSteps = [...(pattern.activeSteps || Array(patternSteps).fill(0))];
    while (activeSteps.length < patternSteps) activeSteps.push(0);

    // 3. Vider proprement chaque pas sur place SANS décaler les autres pas
    for (let l = minLinear; l <= maxLinear; l++) {
      if (l < preRollStepsCount) {
        preRollNotes[l] = '';
        preRollLyrics[l] = '';
        preRollActiveSteps[l] = '0';
      } else {
        const stepIdx = l - preRollStepsCount;
        if (stepIdx < patternSteps) {
          notes[stepIdx] = '';
          lyrics[stepIdx] = '';
          activeSteps[stepIdx] = '0';
        }
      }
    }

    // Déterminer le pas d'ancrage de début à partir de minLinear (sécurité sélection inversée)
    const anchorIsPreRoll = minLinear < preRollStepsCount;
    const anchorStep = anchorIsPreRoll ? minLinear : (minLinear - preRollStepsCount);

    // 4. Mettre à jour atomiquement tracks, selectedStepIdx, selectedStepIsPreRoll et vider selectedStepRange
    set(prev => ({
      tracks: prev.tracks.map(t => {
        if (t.id === track.id || String(t.id) === String(track.id)) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === pattern.id || String(p.id) === String(pattern.id)) {
                return {
                  ...p,
                  notes,
                  lyrics,
                  activeSteps,
                  preRollNotes,
                  preRollLyrics,
                  preRollActiveSteps
                };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: prev.tracksVersion + 1,
      selectedStepIdx: anchorStep,
      selectedStepIsPreRoll: anchorIsPreRoll,
      selectedStepRange: null
    }));
  },

  pasteVoiceSteps: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number, notesOnly = false) => {
    const state = get();
    let clipboardSteps: VoiceStepData[] = [];
    if (state.voiceStepsClipboard?.steps && state.voiceStepsClipboard.steps.length > 0) {
      clipboardSteps = state.voiceStepsClipboard.steps;
    } else if (state.vocalNotesClipboard && state.vocalNotesClipboard.length > 0) {
      clipboardSteps = state.vocalNotesClipboard.map(n => ({
        note: n,
        syllable: '',
        role: n ? 'P' : '0'
      }));
    }

    if (clipboardSteps.length === 0) return;

    let track = state.tracks.find(t => t.id === targetTrackId || String(t.id) === String(targetTrackId));
    if (!track) {
      track = state.tracks.find(t => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id;
        const isVoiceType = instId === 'puxador' || instId === 'coro' || String(t.id).includes('coro') || String(t.id).includes('puxador');
        return isVoiceType && !t.isBusFolder && t.patterns && t.patterns.length > 0;
      });
    }
    if (!track) return;

    let finalTargetPatternId: number | undefined = targetPatternId;
    if (finalTargetPatternId === undefined || finalTargetPatternId === null || finalTargetPatternId === 0) {
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        const cellEl = activeEl?.closest?.('[data-pattern-id]');
        if (cellEl) {
          const pAttr = cellEl.getAttribute('data-pattern-id');
          if (pAttr) finalTargetPatternId = parseInt(pAttr, 10);
        }
      }
    }
    if (finalTargetPatternId === undefined || finalTargetPatternId === null || finalTargetPatternId === 0) {
      finalTargetPatternId = state.selectedPatternId ?? undefined;
    }
    if (finalTargetPatternId === undefined || finalTargetPatternId === null || finalTargetPatternId === 0) {
      finalTargetPatternId = track.selectedPatternId ?? undefined;
    }

    let pattern = finalTargetPatternId !== undefined
      ? track.patterns.find(p => p.id === finalTargetPatternId || String(p.id) === String(finalTargetPatternId))
      : undefined;

    if (!pattern && track.patterns && track.patterns.length > 0) {
      pattern = track.patterns.find(p => p.id === track.selectedPatternId) || track.patterns[0];
    }
    if (!pattern) return;

    console.log('📋 [Toada Paste Target]', {
      patternId: pattern.id,
      patternName: pattern.name,
      targetStep: startStepIdx,
      targetIsPreRoll: startIsPreRoll
    });

    const instId = instrumentsConfig[track.instrumentIdx]?.id;
    const isCoro = instId === 'coro' || String(track.id).toLowerCase().includes('coro') || track.customName?.toLowerCase().includes('coro');
    // Consigne 1 : Conversion automatique du rôle vocal (force 'P' pour puxador, 'C' pour coro)
    const defaultVoiceRole: 'P' | 'C' = isCoro ? 'C' : 'P';

    // Consigne 2 : Borne dynamique de l'anacrouse
    const preRollStepsCount = pattern.preRollActiveSteps?.length || 16;
    const patternSteps = pattern.steps || 16;

    const preRollNotes = [...(pattern.preRollNotes || Array(preRollStepsCount).fill(''))];
    while (preRollNotes.length < preRollStepsCount) preRollNotes.push('');
    const preRollLyrics = [...(pattern.preRollLyrics || Array(preRollStepsCount).fill(''))];
    while (preRollLyrics.length < preRollStepsCount) preRollLyrics.push('');
    const preRollActiveSteps = [...(pattern.preRollActiveSteps || Array(preRollStepsCount).fill(0))];
    while (preRollActiveSteps.length < preRollStepsCount) preRollActiveSteps.push(0);

    const notes = [...(pattern.notes || Array(patternSteps).fill(''))];
    while (notes.length < patternSteps) notes.push('');
    const lyrics = [...(pattern.lyrics || Array(patternSteps).fill(''))];
    while (lyrics.length < patternSteps) lyrics.push('');
    const activeSteps = [...(pattern.activeSteps || Array(patternSteps).fill(0))];
    while (activeSteps.length < patternSteps) activeSteps.push(0);

    const startLinear = startIsPreRoll ? startStepIdx : (preRollStepsCount + startStepIdx);

    for (let i = 0; i < clipboardSteps.length; i++) {
      const stepData = clipboardSteps[i];
      const currentLinear = startLinear + i;
      const isProlongation = Boolean(stepData.isProlongation);
      const isHoldN = isVoiceHoldNote(stepData.note);
      const isHoldS = stepData.syllable === '-' || stepData.syllable === '───' || isProlongation;
      const isHoldStep = isProlongation || isHoldN || isHoldS;

      if (currentLinear < preRollStepsCount) {
        // Dans l'anacrouse
        const prevNote = currentLinear > 0 ? preRollNotes[currentLinear - 1] : '';
        const effectiveNote = stepData.note || (isHoldStep ? prevNote : '');

        if (notesOnly) {
          preRollNotes[currentLinear] = effectiveNote;
          if (effectiveNote && effectiveNote.trim() !== '') {
            preRollActiveSteps[currentLinear] = defaultVoiceRole;
          } else if (isHoldStep && prevNote) {
            preRollActiveSteps[currentLinear] = defaultVoiceRole;
          }
        } else {
          preRollNotes[currentLinear] = effectiveNote;
          preRollLyrics[currentLinear] = stepData.syllable;
          if ((effectiveNote && effectiveNote.trim() !== '') || (isHoldStep && prevNote)) {
            preRollActiveSteps[currentLinear] = defaultVoiceRole;
          } else if (stepData.role && stepData.role !== '0') {
            preRollActiveSteps[currentLinear] = defaultVoiceRole;
          } else {
            preRollActiveSteps[currentLinear] = 0;
          }
        }
      } else {
        // Traversée vers la Mesure 1 (corps principal)
        const stepIdx = currentLinear - preRollStepsCount;
        if (stepIdx >= patternSteps) {
          // Arrêt propre en fin de motif sans déborder
          break;
        }

        const prevNote = stepIdx > 0 ? notes[stepIdx - 1] : (preRollStepsCount > 0 ? preRollNotes[preRollStepsCount - 1] : '');
        const effectiveNote = stepData.note || (isHoldStep ? prevNote : '');

        if (notesOnly) {
          notes[stepIdx] = effectiveNote;
          if (effectiveNote && effectiveNote.trim() !== '') {
            activeSteps[stepIdx] = defaultVoiceRole;
          } else if (isHoldStep && prevNote) {
            activeSteps[stepIdx] = defaultVoiceRole;
          }
        } else {
          notes[stepIdx] = effectiveNote;
          lyrics[stepIdx] = stepData.syllable;
          if ((effectiveNote && effectiveNote.trim() !== '') || (isHoldStep && prevNote)) {
            activeSteps[stepIdx] = defaultVoiceRole;
          } else if (stepData.role && stepData.role !== '0') {
            activeSteps[stepIdx] = defaultVoiceRole;
          } else {
            activeSteps[stepIdx] = 0;
          }
        }
      }
    }

    state.pushUndoState();

    set(prev => ({
      tracks: prev.tracks.map(t => {
        if (t.id === track.id || String(t.id) === String(track.id)) {
          return {
            ...t,
            patterns: t.patterns.map(p => {
              if (p.id === pattern.id || String(p.id) === String(pattern.id)) {
                return {
                  ...p,
                  notes,
                  lyrics,
                  activeSteps,
                  preRollNotes,
                  preRollLyrics,
                  preRollActiveSteps
                };
              }
              return p;
            })
          };
        }
        return t;
      }),
      tracksVersion: prev.tracksVersion + 1
    }));
  },

  copySelectedNotesRange: (rangeOverride) => {
    get().copyVoiceStepsRange(rangeOverride);
  },

  pasteNotesOnlyStartingAt: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number) => {
    get().pasteVoiceSteps(targetTrackId, targetPatternId, startIsPreRoll, startStepIdx, true);
  },

  setCopiedPattern: (pattern) => set({ copiedPattern: pattern }),
  setCopiedSection: (section) => set({ copiedSection: section }),

  handleCopyPattern: (pattern) => {
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = null;
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
    const clone = JSON.parse(JSON.stringify(pattern));
    set({ copiedPattern: clone });
  },

  handleCopySongSection: (section) => {
    const state = get();
    const length = section.endMeasure - section.startMeasure + 1;
    const assignments: { [trackId: number]: (number | null)[] } = {};

    state.tracks.forEach(t => {
      const arr: (number | null)[] = [];
      for (let m = section.startMeasure; m <= section.endMeasure; m++) {
        const assignedPattern = t.patterns.find(p => p.measureAssignments[m]);
        arr.push(assignedPattern ? assignedPattern.id : null);
      }
      assignments[t.id] = arr;
    });

    const childSections = state.songSections.filter(s => 
      s.id !== section.id && 
      s.startMeasure >= section.startMeasure && 
      s.endMeasure <= section.endMeasure
    ).map(s => ({
      ...s,
      relativeStart: s.startMeasure - section.startMeasure,
      relativeEnd: s.endMeasure - section.startMeasure
    }));

    const data = {
      length,
      name: section.name,
      color: section.color || '#27ae60',
      repeatCount: section.repeatCount || 1,
      assignments,
      childSections
    };
    set({
      copiedSection: data,
      timelineClipboard: null
    });
  },

  handlePasteSongSection: (destStartMeasure) => {
    const state = get();
    if (!state.copiedSection) return;
    
    state.pushUndoState();
    const copied = state.copiedSection;
    const len = copied.length;
    const end = destStartMeasure + len - 1;

    set((prev) => {
      const updates: Partial<SequencerStore> = {};
      
      if (end >= prev.totalMeasures) {
        const proposedTotal = end + 1;
        if (!prev.hasFullPlaybackAccess && prev.maxMeasuresAllowed !== null && proposedTotal > prev.maxMeasuresAllowed) {
          alert(`Limite de ${prev.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
          return prev;
        }
        updates.totalMeasures = proposedTotal;
      }

      updates.tracks = prev.tracks.map(t => {
        const copiedArr = copied.assignments[t.id];
        if (!copiedArr) return t;

        const nextPatterns = t.patterns.map(p => {
          const assign = [...p.measureAssignments];
          while (assign.length <= end) assign.push(false);
          
          for (let i = 0; i < len; i++) {
            const mIdx = destStartMeasure + i;
            assign[mIdx] = p.id === copiedArr[i];
          }
          return { ...p, measureAssignments: assign };
        });
        return { ...t, patterns: nextPatterns };
      });
      
      if (copied.childSections) {
        let newSongSections = prev.songSections ? [...prev.songSections] : [];
        copied.childSections.forEach((child: any) => {
          newSongSections.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: child.name,
            startMeasure: destStartMeasure + child.relativeStart,
            endMeasure: destStartMeasure + child.relativeEnd,
            color: child.color,
            repeatCount: child.repeatCount,
            level: child.level
          });
        });
        updates.songSections = newSongSections;
      }

      return updates;
    });
    
    // Create the section object in the store
    const stateAfterPasting = get();
    stateAfterPasting.handleCreateSongSection(copied.name, destStartMeasure, end, copied.color, copied.repeatCount, copied.level);
  },

  copyAllTrackPatterns: (trackId: number) => {
    const state = get();
    const rawTrack = state.tracks.find(t => t.id === trackId || String(t.id) === String(trackId));
    if (!rawTrack) return;

    // Résolution de la piste porteuse réelle (Track Linking Alfaias et Toada)
    let effectiveTrack = rawTrack;
    if (rawTrack.linkedToTrackId) {
      const parentBus = state.tracks.find(t => String(t.id) === String(rawTrack.linkedToTrackId) && t.isLinkFolder);
      if (parentBus && parentBus.patterns && parentBus.patterns.length > 0) {
        effectiveTrack = parentBus;
      }
    } else if (rawTrack.isLinkMaster) {
      const parentBus = state.tracks.find(t => (String(t.id) === String(rawTrack.id) || String(t.linkedToTrackId) === String(rawTrack.id)) && t.isLinkFolder);
      if (parentBus && parentBus.patterns && parentBus.patterns.length > 0) {
        effectiveTrack = parentBus;
      }
    } else if (isToadaBus(rawTrack) && (!rawTrack.patterns || rawTrack.patterns.length === 0)) {
      const vocalChild = state.tracks.find(t => isToadaChild(t, state.tracks) && t.patterns && t.patterns.length > 0);
      if (vocalChild) effectiveTrack = vocalChild;
    }

    const inst = instrumentsConfig[effectiveTrack.instrumentIdx] || instrumentsConfig[rawTrack.instrumentIdx];
    const instId = inst?.id || (isToadaBus(rawTrack) ? 'toada' : '');
    const family = getInstrumentFamily(instId);
    const sourceType = (instId || '').toLowerCase();
    const sourceName = rawTrack.customName || inst?.name || (state.lang === 'fr' ? 'Piste' : 'Faixa');

    const clonedPatterns: Pattern[] = JSON.parse(JSON.stringify(effectiveTrack.patterns || []));

    const timelineAssignments: Record<string, boolean[]> = {};
    clonedPatterns.forEach(p => {
      if (p.measureAssignments) {
        timelineAssignments[String(p.id)] = [...p.measureAssignments];
      }
    });

    set({
      instrumentPatternsClipboard: {
        sourceTrackId: rawTrack.id,
        sourceType,
        sourceName,
        sourceInstrumentIdx: effectiveTrack.instrumentIdx,
        sourceInstId: instId,
        sourceFamily: family,
        patterns: clonedPatterns,
        timelineAssignments
      }
    });

    window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    const count = clonedPatterns.length;
    const msg = state.lang === 'fr'
      ? `${count} motif${count > 1 ? 's' : ''} copié${count > 1 ? 's' : ''}`
      : `${count} padrão(ões) copiado(s)`;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
  },

  pasteAllTrackPatterns: (targetTrackId: number, modeOrApplyTimeline: boolean | 'libraryOnly' | 'libraryAndTimeline' = false) => {
    const state = get();
    const clip = state.instrumentPatternsClipboard;
    if (!clip || !clip.patterns || clip.patterns.length === 0) return;

    const rawTargetTrack = state.tracks.find(t => t.id === targetTrackId || String(t.id) === String(targetTrackId));
    if (!rawTargetTrack) return;

    // Résolution de la piste porteuse réelle cible (Track Linking Alfaias et Toada)
    let effectiveTargetTrack = rawTargetTrack;
    if (rawTargetTrack.linkedToTrackId) {
      const parentBus = state.tracks.find(t => String(t.id) === String(rawTargetTrack.linkedToTrackId) && t.isLinkFolder);
      if (parentBus) effectiveTargetTrack = parentBus;
    } else if (rawTargetTrack.isLinkMaster) {
      const parentBus = state.tracks.find(t => (String(t.id) === String(rawTargetTrack.id) || String(t.linkedToTrackId) === String(rawTargetTrack.id)) && t.isLinkFolder);
      if (parentBus) effectiveTargetTrack = parentBus;
    } else if (isToadaBus(rawTargetTrack) && (!rawTargetTrack.patterns || rawTargetTrack.patterns.length === 0)) {
      const vocalChild = state.tracks.find(t => isToadaChild(t, state.tracks));
      if (vocalChild) effectiveTargetTrack = vocalChild;
    }

    const sourceType = (clip.sourceType || clip.sourceInstId || '').toLowerCase();
    const targetInst = instrumentsConfig[effectiveTargetTrack.instrumentIdx];
    const targetType = (targetInst?.id || (isToadaBus(effectiveTargetTrack) ? 'toada' : '')).toLowerCase();

    if (!canTransferPatterns(sourceType || clip, targetType || effectiveTargetTrack)) return;

    state.pushUndoState();

    const isVocalTarget = targetType === 'puxador' || targetType === 'coro' || String(effectiveTargetTrack.id).includes('coro') || String(effectiveTargetTrack.id).includes('puxador');
    const vocalRole: 'P' | 'C' = (targetType === 'coro' || String(effectiveTargetTrack.id).toLowerCase().includes('coro')) ? 'C' : 'P';

    const totalMeasures = state.totalMeasures || 4;
    const applyTimeline = typeof modeOrApplyTimeline === 'boolean'
      ? modeOrApplyTimeline
      : modeOrApplyTimeline === 'libraryAndTimeline';

    const existingPatterns = [...(effectiveTargetTrack.patterns || [])];
    const accNewPatterns: Pattern[] = [];

    clip.patterns.forEach((p, idx) => {
      const clonedP: Pattern = JSON.parse(JSON.stringify(p));
      clonedP.id = Date.now() + Math.floor(Math.random() * 100000) + idx;

      // Garantir l'unicité et l'incrémentation via getNextPatternName
      clonedP.name = getNextPatternName([...existingPatterns, ...accNewPatterns], p.name, state.lang || 'fr');

      if (isVocalTarget && clonedP.activeSteps) {
        clonedP.activeSteps = convertStepsToVocalRole(clonedP.activeSteps, vocalRole);
        if (clonedP.preRollActiveSteps) {
          clonedP.preRollActiveSteps = convertStepsToVocalRole(clonedP.preRollActiveSteps, vocalRole);
        }
      }

      if (!applyTimeline) {
        clonedP.measureAssignments = Array(totalMeasures).fill(false);
      } else {
        const assignments = clonedP.measureAssignments ? [...clonedP.measureAssignments] : [];
        while (assignments.length < totalMeasures) assignments.push(false);
        clonedP.measureAssignments = assignments.slice(0, totalMeasures);
      }

      accNewPatterns.push(clonedP);
    });

    const targetId = effectiveTargetTrack.id;
    const updatedPatterns = [...existingPatterns, ...accNewPatterns];

    set(curr => ({
      tracks: curr.tracks.map(t => {
        if (t.id === targetId || String(t.id) === String(targetId)) {
          return {
            ...t,
            patterns: updatedPatterns,
            selectedPatternId: accNewPatterns[0]?.id || t.selectedPatternId || updatedPatterns[0]?.id || 0
          };
        }
        return t;
      }),
      tracksVersion: (curr.tracksVersion || 0) + 1
    }));

    const count = accNewPatterns.length;
    const msg = state.lang === 'fr'
      ? `${count} motif${count > 1 ? 's' : ''} collé${count > 1 ? 's' : ''}`
      : `${count} padrão(ões) colado(s)`;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
  }
});

export interface EcoConfig {
  disableFx: boolean;
  disableEq: boolean;
  disableAnimations: boolean;
}

export interface ProjectSettingsSlice {
  letras: string;
  metadata: PresetMetadata;
  isLeftHanded: boolean;
  lang: Language;
  vocalCalibrationLatencyMs: number;
  isEcoMode: boolean;
  ecoConfig: EcoConfig;
  editingTrackId: number | null;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll: boolean;
  selectedSubIndex: 0 | 1 | null;
  selectedStepRange: SelectedStepRange | null;
  vocalTransposeSteps: number;
  isTracksCollapsed: boolean;
  isPreviewMode: boolean;
  hasFullPlaybackAccess: boolean;
  isVisitorAuthModalOpen: boolean;
  isSubscriptionModalOpen: boolean;

  setLetras: (letras: string) => void;
  setMetadata: (metadata: PresetMetadata) => void;
  setIsLeftHanded: (val: boolean) => void;
  setLang: (lang: Language) => void;
  setVocalCalibrationLatencyMs: (val: number) => void;
  handleExtractLyrics: () => void;
  toggleEcoMode: () => void;
  toggleEcoOption: (key: keyof EcoConfig) => void;
  setEditingTrackId: (id: number | null) => void;
  closeDetailEditor: () => void;
  setSelectedStepIdx: (idx: number | null, isPreRoll?: boolean, subIndex?: 0 | 1 | null) => void;
  setSelectedStepIndex: (idx: number | null, isPreRoll?: boolean) => void;
  setSelectedStepRange: (range: SelectedStepRange | null) => void;
  setVocalTransposeSteps: (steps: number) => void;
  incrementVocalTransposeSteps: () => void;
  decrementVocalTransposeSteps: () => void;
  transposePatternNotes: (trackId: number, patternId: string | number, semitones: number) => void;
  toggleTracksCollapsed: () => void;
  setIsPreviewMode: (val: boolean) => void;
  setHasFullPlaybackAccess: (val: boolean) => void;
  openVisitorAuthModal: () => void;
  closeVisitorAuthModal: () => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
}

const detectEcoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('o-girador-eco-mode');
  if (saved !== null) {
    return saved === 'true';
  }
  const cores = navigator.hardwareConcurrency;
  const isLowEndCPU = cores !== undefined && cores <= 4;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  return isLowEndCPU || isMobile;
};

const createProjectSettingsSlice: StateCreator<SequencerStore, [], [], ProjectSettingsSlice> = (set, get) => ({
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

    // 1. Sauvegarde Undo atomique
    state.pushUndoState();

    // 2. Reprise de l'AudioContext si suspendu
    try {
      if (typeof window !== 'undefined' && Tone.context && Tone.context.state !== 'running') {
        Tone.start().catch(() => {});
      }
    } catch (_) {}

    let firstTransposedNote: string | null = null;

    // 3. Mise à jour des tracks et réécriture des notes
    const newTracks = state.tracks.map((t) => {
      if (String(t.id) !== String(trackId)) return t;

      const newPatterns = t.patterns.map((p) => {
        if (String(p.id) !== String(patternId)) return p;

        const transposedNotes = (p.notes || []).map((n) => transposeNoteString(n, semitones));
        const transposedPreRollNotes = p.preRollNotes
          ? p.preRollNotes.map((n) => transposeNoteString(n, semitones))
          : undefined;

        // Détection de la première note transposée valide pour pré-écoute immédiate
        if (!firstTransposedNote) {
          for (const n of transposedNotes) {
            if (n && n !== '0' && n !== '───' && n !== '-') {
              firstTransposedNote = n;
              break;
            }
          }
          if (!firstTransposedNote && transposedPreRollNotes) {
            for (const n of transposedPreRollNotes) {
              if (n && n !== '0' && n !== '───' && n !== '-') {
                firstTransposedNote = n;
                break;
              }
            }
          }
        }

        return {
          ...p,
          notes: transposedNotes,
          ...(transposedPreRollNotes ? { preRollNotes: transposedPreRollNotes } : {}),
        };
      });

      return {
        ...t,
        patterns: newPatterns,
      };
    });

    const currentSteps = state.vocalTransposeSteps || 0;
    const nextSteps = currentSteps + semitones;

    set({
      tracks: newTracks,
      tracksVersion: (state.tracksVersion || 0) + 1,
      vocalTransposeSteps: nextSteps,
    });

    // 4. Déclenchement de l'audition de la première note transposée
    if (firstTransposedNote) {
      const noteToPreview = firstTransposedNote;
      import('../hooks/useAudioSync')
        .then(({ audioEngine }) => {
          if (audioEngine) {
            audioEngine.triggerVoiceAttackRelease(noteToPreview, '8n');
          }
        })
        .catch(() => {});
    }
  },

  
  handleExtractLyrics: () => {
    const state = get();
    const voiceTracks = state.tracks.filter((t) => instrumentsConfig[t.instrumentIdx]?.type === 'voice');
    const htmlArr: string[] = [];

    voiceTracks.forEach((t) => {
      t.patterns.forEach(p => {
        let trackStr = '';
        for (let i = 0; i < p.steps; i++) {
          if (p.activeSteps[i] !== 0 && p.lyrics && p.lyrics[i]) {
            const rawLyric = p.lyrics[i];
            const hasSpace = rawLyric.endsWith(' ');
            const syl = rawLyric.replace(/-$/, '').trim();
            if (syl) {
              trackStr += syl + (hasSpace ? ' ' : '');
            }
          }
        }
        if (trackStr) {
          htmlArr.push(trackStr.trim());
        }
      });
    });

    set({ letras: htmlArr.join('\n\n') });
  },
  setIsPreviewMode: (val) => set({ isPreviewMode: val }),
  setHasFullPlaybackAccess: (val) => set({ hasFullPlaybackAccess: val }),
  openVisitorAuthModal: () => set({ isVisitorAuthModalOpen: true }),
  closeVisitorAuthModal: () => set({ isVisitorAuthModalOpen: false }),
  openSubscriptionModal: () => set({ isSubscriptionModalOpen: true }),
  closeSubscriptionModal: () => set({ isSubscriptionModalOpen: false })
});

// ---------------------------------------------------------
// STORE PRINCIPAL EXPORTÉ
// ---------------------------------------------------------
export type SequencerStore = TrackSlice & TrackHierarchySlice & StructureSlice & PlaybackSlice & HistorySlice & ClipboardSlice & ProjectSettingsSlice & UISlice & SpeedTrainerSlice & TrainingSlice;

export const useSequencerStore = create<SequencerStore>((...a) => ({
  ...createTrackSlice(...a),
  ...createTrackHierarchySlice(...a),
  ...createStructureSlice(...a),
  ...createPlaybackSlice(...a),
  ...createHistorySlice(...a),
  ...createClipboardSlice(...a),
  ...createProjectSettingsSlice(...a),
  ...createUISlice(...a),
  ...createSpeedTrainerSlice(...a),
  ...createTrainingSlice(...a),
}));

export * from './helpers/trackVisibilityHelpers';
export * from './helpers/trackRodaGeometryHelpers';
export * from './helpers/trackMetaCache';
export * from './helpers/trackMixerSelectors';
export * from './helpers/mixerOrderingHelpers';
export * from './helpers/undoHistoryHelpers';
export * from './helpers/measureOperationsHelper';
export * from './helpers/measureResizeHelper';
export * from './helpers/timelineSectionHelpers';
export * from './helpers/timelineStretchHelper';
export * from './helpers/timelineStretchInsertHelper';
export * from './helpers/timelineStretchOverwriteHelper';
export * from './helpers/timelineBlockDuplicationHelper';
export * from './helpers/timelineAutomationSelectionHelper';
export * from './helpers/timelineSelectionHelpers';
export * from './helpers/timelineCellDeleteHelper';
export * from './helpers/timelineCellDuplicateHelper';
export * from './helpers/timelineGridExpandHelper';
export * from './helpers/timelineClipboardTypes';
export * from './helpers/timelineClipboardCopyCutHelper';
export * from './helpers/timelineClipboardPasteHelper';
export * from './helpers/trackReorderMixerHelper';
export * from './helpers/trackReorderRodaWagonHelper';
export * from './helpers/trackLinkingHelpers';
export * from './helpers/trackBusHelpers';
export * from './slices/playbackSlice';
export * from './slices/historySlice';
export * from './slices/transportSlice';
export * from './slices/songStructureSlice';
export * from './slices/timelineSlice';
export * from './slices/trackHierarchySlice';

if (typeof window !== 'undefined') {
  (window as any).useSequencerStore = useSequencerStore;
}



