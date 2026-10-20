import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

export const handleTrackSwingChangeState = (
  tracks: TrackGroup[],
  id: number,
  val: number
): TrackGroup[] => tracks.map((t) => t.id === id ? { ...t, swingIntensity: val, balancoAmount: val } : t);

export const handlePatternSwingChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  val: number
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map((p) => (p.id === patternId ? { ...p, swingIntensity: val, balancoAmount: val } : p))
    };
  }
  return t;
});

export const handleTrackBalancoChangeState = (
  tracks: TrackGroup[],
  trackId: number | string,
  presetId?: string,
  amount?: number
): TrackGroup[] => tracks.map((t) => {
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
});

export const handlePatternBalancoChangeState = (
  tracks: TrackGroup[],
  trackId: number | string,
  patternId: number,
  presetId?: string,
  amount?: number
): TrackGroup[] => tracks.map((t) => {
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
});

export const handleResetPatternMicrotimingsState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number
): TrackGroup[] => tracks.map((t) => {
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
});
