import { TrackGroup, MasterFX } from '../../types';

export interface MasterEffectsActiveState {
  compressor: boolean;
  reverb: boolean;
  disto: boolean;
}

export interface TrackAcousticsSlice {
  masterFX: MasterFX;
  masterEffectsActive: MasterEffectsActiveState;

  handleTrackVolumeChange: (id: number, val: number) => void;
  handleTrackMeasureVolChange: (trackId: number, mIdx: number, val: number) => void;
  handleTrackMeasureVolTransitionChange: (trackId: number, mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleTrackMeasurePanChange: (trackId: number, mIdx: number, val: number) => void;
  handleTrackMeasurePanTransitionChange: (trackId: number, mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleTrackMeasureReverbChange: (trackId: number, mIdx: number, val: number) => void;
  handleTrackMeasureReverbTransitionChange: (trackId: number, mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  toggleTrackAutomationBypass: (trackId: number, type: 'volume' | 'pan' | 'reverb') => void;
  setTrackTuning: (trackId: number, tuning: number) => void;
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
  handleTrackLowCutToggle: (id: number) => void;
  handleTrackEQChange: (id: number, bands: Partial<TrackGroup['eqBands']>) => void;
  handleTrackEQReset: (id: number) => void;
  setMasterFxVolume: (fxType: 'reverb' | 'distortion', volume: number) => void;
  setMasterFxParam: (fxType: 'reverb' | 'distortion', param: 'time' | 'drive', value: number) => void;
  toggleMasterFxMute: (fxType: 'reverb' | 'distortion') => void;
  setMasterFX: (masterFX: MasterFX) => void;
  toggleMasterEffectActive: (effect: 'compressor' | 'reverb' | 'disto') => void;
  setMasterEffectsActive: (active: Partial<MasterEffectsActiveState>) => void;
}
