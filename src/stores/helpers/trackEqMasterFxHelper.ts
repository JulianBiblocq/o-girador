import { TrackGroup, MasterFX } from '../../types';
import { MasterEffectsActiveState } from '../slices/trackAcousticsSliceTypes';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';

export const handleTrackVolumeChangeState = (tracks: TrackGroup[], id: number, val: number): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id) return t;
    const isAutoActive = hasActiveTrackAutomation(t, 'volume');
    return {
      ...t,
      volumeVal: val,
      measureVols: isAutoActive ? t.measureVols : undefined,
      measureVolTransitions: isAutoActive ? t.measureVolTransitions : undefined,
    };
  });

export const handleTrackReverbChangeState = (tracks: TrackGroup[], id: number, val: number): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id) return t;
    const isAutoActive = hasActiveTrackAutomation(t, 'reverb');
    return {
      ...t,
      reverbVal: val,
      measureReverbSends: isAutoActive ? t.measureReverbSends : undefined,
      measureReverbTransitions: isAutoActive ? t.measureReverbTransitions : undefined,
    };
  });

export const handleTrackPanChangeState = (tracks: TrackGroup[], id: number, val: number): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id) return t;
    const isAutoActive = hasActiveTrackAutomation(t, 'pan');
    return {
      ...t,
      pan: val,
      panVal: val,
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
  tracks: TrackGroup[],
  id: number,
  bands: Partial<TrackGroup['eqBands']>
): TrackGroup[] =>
  tracks.map(t => {
    if (t.id !== id || !bands) return t;
    const currentBands = t.eqBands || {
      low: { f: 100, g: 0 },
      mid: { f: 1000, g: 0, q: 'wide' as const },
      high: { f: 8000, g: 0 },
    };
    return {
      ...t,
      eqBands: {
        low: { ...currentBands.low, ...(bands.low || {}) },
        mid: { ...currentBands.mid, ...(bands.mid || {}) },
        high: { ...currentBands.high, ...(bands.high || {}) },
      },
    };
  });

export const handleTrackEQResetState = (tracks: TrackGroup[], id: number): TrackGroup[] =>
  tracks.map(t =>
    t.id === id
      ? {
          ...t,
          lowCut: false,
          eqBands: {
            low: { f: 100, g: 0 },
            mid: { f: 1000, g: 0, q: 'wide' as const },
            high: { f: 8000, g: 0 },
          },
        }
      : t
  );

export const setMasterFxVolumeState = (masterFX: MasterFX, fxType: 'reverb' | 'distortion', volume: number): MasterFX => ({
  ...masterFX,
  [fxType]: { ...masterFX[fxType], returnVolume: volume },
});

export const setMasterFxParamState = (
  masterFX: MasterFX,
  fxType: 'reverb' | 'distortion',
  param: 'time' | 'drive',
  value: number
): MasterFX => ({
  ...masterFX,
  [fxType]: { ...masterFX[fxType], [param]: value },
});

export const toggleMasterEffectActiveState = (
  current: MasterEffectsActiveState,
  effect: 'compressor' | 'reverb' | 'disto'
): MasterEffectsActiveState => ({ ...current, [effect]: !current[effect] });

export const setMasterEffectsActiveState = (
  current: MasterEffectsActiveState,
  active: Partial<MasterEffectsActiveState>
): MasterEffectsActiveState => ({ ...current, ...active });
