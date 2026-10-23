import { TrackGroup, MasterFX } from '../../types';
import { MasterEffectsActiveState } from '../slices/trackAcousticsSliceTypes';

export const handleTrackLowCutToggleState = (
  tracks: TrackGroup[],
  id: number
): TrackGroup[] => tracks.map((t) => t.id === id ? { ...t, lowCut: !t.lowCut } : t);

export const handleTrackEQChangeState = (
  tracks: TrackGroup[],
  id: number,
  bands: Partial<TrackGroup['eqBands']>
): TrackGroup[] => tracks.map((t) => {
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
});

export const handleTrackEQResetState = (
  tracks: TrackGroup[],
  id: number
): TrackGroup[] => tracks.map((t) => t.id === id ? {
  ...t,
  lowCut: false,
  eqBands: {
    low: { f: 100, g: 0 },
    mid: { f: 1000, g: 0, q: 'wide' as const },
    high: { f: 8000, g: 0 }
  }
} : t);

export const setMasterFxVolumeState = (
  masterFX: MasterFX,
  fxType: 'reverb' | 'distortion',
  volume: number
): MasterFX => ({
  ...masterFX,
  [fxType]: {
    ...masterFX[fxType],
    returnVolume: volume
  }
});

export const setMasterFxParamState = (
  masterFX: MasterFX,
  fxType: 'reverb' | 'distortion',
  param: 'time' | 'drive',
  value: number
): MasterFX => ({
  ...masterFX,
  [fxType]: {
    ...masterFX[fxType],
    [param]: value
  }
});

export const toggleMasterEffectActiveState = (
  current: MasterEffectsActiveState,
  effect: 'compressor' | 'reverb' | 'disto'
): MasterEffectsActiveState => ({
  ...current,
  [effect]: !current[effect]
});

export const setMasterEffectsActiveState = (
  current: MasterEffectsActiveState,
  active: Partial<MasterEffectsActiveState>
): MasterEffectsActiveState => ({
  ...current,
  ...active
});
