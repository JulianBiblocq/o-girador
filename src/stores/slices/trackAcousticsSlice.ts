import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { TrackAcousticsSlice } from './trackAcousticsSliceTypes';
import { setMasterMonoCheck } from '../../audio/effects/masterMonoHandler';
import {
  handleTrackMeasureVolChangeState,
  handleTrackMeasureVolTransitionChangeState,
  handleTrackMeasurePanChangeState,
  handleTrackMeasurePanTransitionChangeState,
  handleTrackMeasureReverbChangeState,
  handleTrackMeasureReverbTransitionChangeState,
  toggleTrackAutomationBypassState
} from '../helpers/trackAcousticAutomationHelper';
import {
  handleTrackSwingChangeState,
  handlePatternSwingChangeState,
  handleTrackBalancoChangeState,
  handlePatternBalancoChangeState,
  handleResetPatternMicrotimingsState
} from '../helpers/trackBalancoSwingHelper';
import {
  handleTrackLowCutToggleState,
  handleTrackEQChangeState,
  handleTrackEQResetState,
  setMasterFxVolumeState,
  setMasterFxParamState,
  toggleMasterEffectActiveState,
  setMasterEffectsActiveState
} from '../helpers/trackEqMasterFxHelper';

export const createTrackAcousticsSlice: StateCreator<SequencerStore, [], [], TrackAcousticsSlice> = (set, get) => ({
  masterFX: {
    reverb: { returnVolume: 70, time: 30, isMuted: false },
    distortion: { returnVolume: 0, drive: 20, isMuted: false }
  },
  masterEffectsActive: { compressor: true, reverb: true, disto: true },
  isMasterMono: false,

  toggleMasterMono: () => {
    const next = !get().isMasterMono;
    setMasterMonoCheck(next);
    set({ isMasterMono: next });
  },
  setMasterMono: (val) => {
    setMasterMonoCheck(val);
    set({ isMasterMono: val });
  },

  handleTrackVolumeChange: (id, val) => {
    set(state => ({ tracks: state.tracks.map(t => t.id === id ? { ...t, volumeVal: val } : t) }));
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
    const totalM = state.totalMeasures || 8;
    set(curr => ({ tracks: handleTrackMeasureVolChangeState(curr.tracks, trackId, mIdx, val, totalM) }));
  },
  handleTrackMeasureVolTransitionChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set(curr => ({ tracks: handleTrackMeasureVolTransitionChangeState(curr.tracks, trackId, mIdx, val, totalM) }));
  },
  handleTrackMeasurePanChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set(curr => ({ tracks: handleTrackMeasurePanChangeState(curr.tracks, trackId, mIdx, val, totalM) }));
  },
  handleTrackMeasurePanTransitionChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set(curr => ({ tracks: handleTrackMeasurePanTransitionChangeState(curr.tracks, trackId, mIdx, val, totalM) }));
  },
  handleTrackMeasureReverbChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set(curr => ({ tracks: handleTrackMeasureReverbChangeState(curr.tracks, trackId, mIdx, val, totalM) }));
  },
  handleTrackMeasureReverbTransitionChange: (trackId, mIdx, val) => {
    const totalM = get().totalMeasures || 8;
    set(curr => ({ tracks: handleTrackMeasureReverbTransitionChangeState(curr.tracks, trackId, mIdx, val, totalM) }));
  },
  toggleTrackAutomationBypass: (trackId, type) => {
    set(curr => ({ tracks: toggleTrackAutomationBypassState(curr.tracks, trackId, type) }));
  },
  setTrackTuning: (trackId, tuning) => set(s => ({ tracks: s.tracks.map(t => t.id === trackId ? { ...t, tuning } : t) })),
  handleTrackReverbChange: (id, val) => set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, reverbVal: val } : t) })),
  handleTrackPanChange: (id, val) => set(s => ({ tracks: s.tracks.map(t => t.id === id ? { ...t, pan: val, panVal: val } : t) })),
  handleTrackSwingChange: (id, val) => set(s => ({ tracks: handleTrackSwingChangeState(s.tracks, id, val) })),
  handlePatternSwingChange: (trackId, patternId, val) => set(s => ({ tracks: handlePatternSwingChangeState(s.tracks, trackId, patternId, val) })),
  handleTrackBalancoChange: (trackId, presetId, amount) => set(s => ({ tracks: handleTrackBalancoChangeState(s.tracks, trackId, presetId, amount) })),
  setTrackBalancoIntensity: (trackId, intensity) => set(s => ({ tracks: s.tracks.map(t => t.id === Number(trackId) ? { ...t, balancoIntensity: intensity } : t) })),
  setTrackBalancoPreset: (trackId, presetId) => set(s => ({ tracks: s.tracks.map(t => t.id === Number(trackId) ? { ...t, balancoPresetId: presetId } : t) })),
  handlePatternBalancoChange: (trackId, patternId, presetId, amount) => set(s => ({ tracks: handlePatternBalancoChangeState(s.tracks, trackId, patternId, presetId, amount) })),
  handleResetPatternMicrotimings: (trackId, patternId) => set(s => ({ tracks: handleResetPatternMicrotimingsState(s.tracks, trackId, patternId) })),
  setTrackFxSend: (trackId, fxType, value) => set(s => ({
    tracks: s.tracks.map(t => t.id === trackId ? { ...t, fxSends: { ...(t.fxSends || { reverb: 0, distortion: 0 }), [fxType]: value } } : t)
  })),
  setTrackPan: (trackId, value) => set(s => ({ tracks: s.tracks.map(t => t.id === trackId ? { ...t, pan: value, panVal: value } : t) })),
  handleTrackLowCutToggle: (id) => set(s => ({ tracks: handleTrackLowCutToggleState(s.tracks, id) })),
  handleTrackEQChange: (id, bands) => set(s => ({ tracks: handleTrackEQChangeState(s.tracks, id, bands) })),
  handleTrackEQReset: (id) => set(s => ({ tracks: handleTrackEQResetState(s.tracks, id) })),
  setMasterFxVolume: (fxType, volume) => set(s => ({ masterFX: setMasterFxVolumeState(s.masterFX, fxType, volume) })),
  setMasterFxParam: (fxType, param, value) => set(s => ({ masterFX: setMasterFxParamState(s.masterFX, fxType, param, value) })),
  setMasterFX: (masterFX) => set({ masterFX }),
  toggleMasterEffectActive: (effect) => set(s => ({ masterEffectsActive: toggleMasterEffectActiveState(s.masterEffectsActive, effect) })),
  setMasterEffectsActive: (active) => set(s => ({ masterEffectsActive: setMasterEffectsActiveState(s.masterEffectsActive, active) }))
});
