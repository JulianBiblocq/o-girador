import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';
import { TrackAcousticsSlice } from './trackAcousticsSliceTypes';
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
  toggleMasterFxMuteState,
  toggleMasterEffectActiveState,
  setMasterEffectsActiveState
} from '../helpers/trackEqMasterFxHelper';

export const createTrackAcousticsSlice: StateCreator<SequencerStore, [], [], TrackAcousticsSlice> = (set, get) => ({
  masterFX: {
    reverb: { returnVolume: 70, time: 30, isMuted: false },
    distortion: { returnVolume: 0, drive: 20, isMuted: false }
  },
  masterEffectsActive: { compressor: true, reverb: true, disto: true },

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
    get().pushUndoState();
    set(curr => ({ tracks: toggleTrackAutomationBypassState(curr.tracks, trackId, type) }));
  },
  setTrackTuning: (trackId, tuning) => {
    set(state => ({ tracks: state.tracks.map(t => t.id === trackId ? { ...t, tuning } : t) }));
  },
  handleTrackReverbChange: (id, val) => {
    set(state => ({ tracks: state.tracks.map(t => t.id === id ? { ...t, reverbVal: val } : t) }));
  },
  handleTrackPanChange: (id, val) => {
    set(state => ({ tracks: state.tracks.map(t => t.id === id ? { ...t, panVal: val, pan: val } : t) }));
  },
  handleTrackSwingChange: (id, val) => {
    set(state => ({ tracks: handleTrackSwingChangeState(state.tracks, id, val) }));
  },
  handlePatternSwingChange: (trackId, patternId, val) => {
    set(state => ({ tracks: handlePatternSwingChangeState(state.tracks, trackId, patternId, val) }));
  },
  handleTrackBalancoChange: (trackId, presetId, amount) => {
    set(state => ({
      tracks: handleTrackBalancoChangeState(state.tracks, trackId, presetId, amount),
      tracksVersion: state.tracksVersion + 1
    }));
  },
  setTrackBalancoIntensity: (trackId, intensity) => get().handleTrackBalancoChange(trackId, undefined, intensity),
  setTrackBalancoPreset: (trackId, presetId) => get().handleTrackBalancoChange(trackId, presetId, undefined),
  handlePatternBalancoChange: (trackId, patternId, presetId, amount) => {
    set(state => ({
      tracks: handlePatternBalancoChangeState(state.tracks, trackId, patternId, presetId, amount),
      tracksVersion: state.tracksVersion + 1
    }));
  },
  handleResetPatternMicrotimings: (trackId, patternId) => {
    set(state => ({ tracks: handleResetPatternMicrotimingsState(state.tracks, trackId, patternId) }));
  },
  setTrackFxSend: (trackId, fxType, value) => {
    set(state => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          const baseFx = t.fxSends || { reverb: 0, distortion: 0 };
          return { ...t, fxSends: { ...baseFx, [fxType]: value } };
        }
        return t;
      })
    }));
  },
  setTrackPan: (trackId, value) => {
    set(state => ({ tracks: state.tracks.map(t => t.id === trackId ? { ...t, pan: value, panVal: value } : t) }));
  },
  handleTrackLowCutToggle: (id) => {
    set(state => ({ tracks: handleTrackLowCutToggleState(state.tracks, id) }));
  },
  handleTrackEQChange: (id, bands) => {
    set(state => ({ tracks: handleTrackEQChangeState(state.tracks, id, bands) }));
  },
  handleTrackEQReset: (id) => {
    set(state => ({ tracks: handleTrackEQResetState(state.tracks, id) }));
  },
  setMasterFxVolume: (fxType, volume) => set(s => ({ masterFX: setMasterFxVolumeState(s.masterFX, fxType, volume) })),
  setMasterFxParam: (fxType, param, value) => set(s => ({ masterFX: setMasterFxParamState(s.masterFX, fxType, param, value) })),
  toggleMasterFxMute: (fxType) => set(s => ({ masterFX: toggleMasterFxMuteState(s.masterFX, fxType) })),
  setMasterFX: (masterFX) => set({ masterFX }),
  toggleMasterEffectActive: (effect) => set(s => ({ masterEffectsActive: toggleMasterEffectActiveState(s.masterEffectsActive, effect) })),
  setMasterEffectsActive: (active) => set(s => ({ masterEffectsActive: setMasterEffectsActiveState(s.masterEffectsActive, active) }))
});
