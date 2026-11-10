import { TrackGroup, MasterFX } from '../../types';
import { MasterEffectsActiveState } from '../slices/trackAcousticsSliceTypes';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';
import {
  DEFAULT_STUDIO_MASTER_BUS_CONFIG, STUDIO_COMPRESSOR_PRESETS,
  STUDIO_REVERB_PRESETS, STUDIO_SATURATION_PRESETS, type StudioMasterBusConfig,
} from '../../audio/effects/studioFxPresets';

const DEFAULT_EQ_BANDS = {
  low: { f: 100, g: 0 },
  mid: { f: 1000, g: 0, q: 'wide' as const },
  high: { f: 8000, g: 0 },
};

export const handleTrackVolumeChangeState = (tracks: TrackGroup[], id: number, val: number): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id) return t;
    const isAutoActive = hasActiveTrackAutomation(t, 'volume');
    return {
      ...t, volumeVal: val,
      measureVols: isAutoActive ? t.measureVols : undefined,
      measureVolTransitions: isAutoActive ? t.measureVolTransitions : undefined,
    };
  });

export const handleTrackReverbChangeState = (tracks: TrackGroup[], id: number, val: number): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id) return t;
    const isAutoActive = hasActiveTrackAutomation(t, 'reverb');
    return {
      ...t, reverbVal: val,
      measureReverbSends: isAutoActive ? t.measureReverbSends : undefined,
      measureReverbTransitions: isAutoActive ? t.measureReverbTransitions : undefined,
    };
  });

export const handleTrackPanChangeState = (tracks: TrackGroup[], id: number, val: number): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id) return t;
    const isAutoActive = hasActiveTrackAutomation(t, 'pan');
    return {
      ...t, pan: val, panVal: val,
      measurePans: isAutoActive ? t.measurePans : undefined,
      measurePanTransitions: isAutoActive ? t.measurePanTransitions : undefined,
    };
  });

export const setTrackDecayState = (tracks: TrackGroup[], trackId: number, decayPct: number): TrackGroup[] => {
  const clamped = Math.max(15, Math.min(100, Math.round(Number(decayPct) || 100)));
  const target = tracks.find(t => t.id === trackId);
  if (!target) return tracks;

  const isAlfaia = target.instrumentIdx === 0 || target.instrumentIdx === 1 || target.instrumentIdx === 2;
  const hasLinkedChildren = tracks.some(t => String(t.linkedToTrackId) === String(trackId));
  const linkRootId = isAlfaia
    ? (target.linkedToTrackId ? String(target.linkedToTrackId) : (target.isLinkMaster || hasLinkedChildren ? String(target.id) : null))
    : null;

  return tracks.map(t => {
    const isTargetOrSameRoleLinked = t.id === trackId || (
      linkRootId !== null &&
      t.instrumentIdx === target.instrumentIdx &&
      (String(t.id) === linkRootId || String(t.linkedToTrackId) === linkRootId)
    );
    return isTargetOrSameRoleLinked ? { ...t, trackDecay: clamped } : t;
  });
};

export const handleTrackLowCutToggleState = (tracks: TrackGroup[], id: number): TrackGroup[] =>
  tracks.map(t => (t.id === id ? { ...t, lowCut: !t.lowCut } : t));

export const handleTrackEQChangeState = (
  tracks: TrackGroup[], id: number, bands: Partial<TrackGroup['eqBands']>
): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id || !bands) return t;
    const cur = t.eqBands || DEFAULT_EQ_BANDS;
    return {
      ...t,
      eqBands: {
        low: { ...cur.low, ...(bands.low || {}) },
        mid: { ...cur.mid, ...(bands.mid || {}) },
        high: { ...cur.high, ...(bands.high || {}) },
      },
    };
  });

export const handleTrackEQResetState = (tracks: TrackGroup[], id: number): TrackGroup[] =>
  tracks.map(t => (t.id === id ? { ...t, lowCut: false, eqBands: { ...DEFAULT_EQ_BANDS } } : t));

export const setMasterFxVolumeState = (masterFX: MasterFX, fxType: 'reverb' | 'distortion', volume: number): MasterFX => ({
  ...masterFX, [fxType]: { ...masterFX[fxType], returnVolume: volume },
});

export const setMasterFxParamState = (
  masterFX: MasterFX, fxType: 'reverb' | 'distortion', param: 'time' | 'drive', value: number
): MasterFX => ({
  ...masterFX, [fxType]: { ...masterFX[fxType], [param]: value },
});

export const toggleMasterEffectActiveState = (
  current: MasterEffectsActiveState, effect: 'compressor' | 'reverb' | 'disto'
): MasterEffectsActiveState => ({ ...current, [effect]: !current[effect] });

export const setMasterEffectsActiveState = (
  current: MasterEffectsActiveState, active: Partial<MasterEffectsActiveState>
): MasterEffectsActiveState => ({ ...current, ...active });

export const applyStudioFxPresetState = (
  masterFX: MasterFX, module: 'reverb' | 'saturation' | 'compressor', presetId: string
): MasterFX => {
  if (module === 'reverb' && STUDIO_REVERB_PRESETS[presetId]) {
    return { ...masterFX, reverb: { ...masterFX.reverb, ...STUDIO_REVERB_PRESETS[presetId].params, presetId } };
  }
  if (module === 'saturation' && STUDIO_SATURATION_PRESETS[presetId]) {
    return { ...masterFX, distortion: { ...masterFX.distortion, ...STUDIO_SATURATION_PRESETS[presetId].params, presetId } };
  }
  if (module === 'compressor' && STUDIO_COMPRESSOR_PRESETS[presetId]) {
    const curBus: StudioMasterBusConfig = { ...DEFAULT_STUDIO_MASTER_BUS_CONFIG, ...(masterFX.masterBus || {}) };
    return { ...masterFX, masterBus: { ...curBus, ...STUDIO_COMPRESSOR_PRESETS[presetId].params, presetId } };
  }
  return masterFX;
};
